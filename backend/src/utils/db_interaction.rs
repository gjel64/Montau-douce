use argon2::{Argon2, password_hash::{PasswordHasher, PasswordVerifier}};
use chrono::{DateTime, Utc};
use poem::{
    Result, handler,
    http::StatusCode,
    web::{Data, Json},
};
use serde_json::{json, Value};
use sqlx::{PgPool};


// Log l'erreur côté serveur, renvoie une 500 sans détails au client
fn internal_err(e: impl std::fmt::Display) -> poem::Error {
    eprintln!("SERVER ERROR: {e}");
    StatusCode::INTERNAL_SERVER_ERROR.into()
}

pub fn hash(passwd: &str) -> Result<String> {
    Ok(Argon2::default().hash_password(passwd.as_bytes()).map_err(internal_err)?.to_string())
}

const DEFAULT_RADIUS: f64 = 1000.0; // 1km radius search for nearby users TODO: change it


#[handler]
pub async fn ping(Data(pool): Data<&PgPool>) -> Result<Json<Value>> {

    let (version,): (String,) = sqlx::query_as("SELECT version()")
        .fetch_one(pool)
        .await
        .map_err(internal_err)?;

    Ok(Json(json!({ "result": version })))
}


#[handler]
pub async fn create_user(Data(pool): Data<&PgPool>, Json(user): Json<Value>) -> Result<Json<Value>> {

    let tel = user["tel"].as_str().ok_or_else(|| poem::Error::from_string("ERROR: Missing tel", StatusCode::BAD_REQUEST))?;
    let name = user["name"].as_str().ok_or_else(|| poem::Error::from_string("ERROR: Missing name", StatusCode::BAD_REQUEST))?;
    let passwd = user["passwd"].as_str().ok_or_else(|| poem::Error::from_string("ERROR: Missing passwd", StatusCode::BAD_REQUEST))?;

    // Le tel sert d'identifiant pour /auth : il doit être unique
    let existing: Option<(i32,)> = sqlx::query_as(
        "SELECT user_id FROM users WHERE user_tel = $1"
    )
    .bind(tel)
    .fetch_optional(pool)
    .await
    .map_err(internal_err)?;

    if existing.is_some() {
        return Err(poem::Error::from_string("ERROR: user already created", StatusCode::CONFLICT));
    }

    let (id,): (i32,) = sqlx::query_as(
        "INSERT INTO users (user_name, user_tel, user_passwd)
         VALUES ($1, $2, $3)
         RETURNING user_id"
    )
    .bind(name)
    .bind(tel)
    .bind(hash(passwd)?)
    .fetch_one(pool)
    .await
    .map_err(internal_err)?;

    create_session(pool, id).await
}


#[handler]
pub async fn fill_user_loc(Data(pool): Data<&PgPool>, Json(data): Json<Value>) -> Result<Json<Value>>{

    let token = data["token"].as_str().ok_or_else(|| poem::Error::from_string("ERROR: Missing token", StatusCode::BAD_REQUEST))?;
    let lat = data["lat"].as_f64().ok_or_else(|| poem::Error::from_string("ERROR: Missing lat", StatusCode::BAD_REQUEST))?;
    let lng = data["lng"].as_f64().ok_or_else(|| poem::Error::from_string("ERROR: Missing lng", StatusCode::BAD_REQUEST))?;

    let id = get_user_id_from_token(pool, token)
    .await
    .map_err(|_| poem::Error::from_string("ERROR: Cannot find user from token", StatusCode::UNAUTHORIZED))?;

    sqlx::query(
        "UPDATE users
        SET lat = $2, lng = $3
        WHERE user_id = $1;
        "
    )
    .bind(id)
    .bind(lat)
    .bind(lng)
    .execute(pool)
    .await
    .map_err(internal_err)?;

    Ok(Json(json!({"result": "updated"})))
    
}


#[handler]
pub async fn fill_user_ics(Data(pool): Data<&PgPool>, Json(data): Json<Value>) -> Result<Json<Value>>{

    let token = data["token"].as_str().ok_or_else(|| poem::Error::from_string("ERROR: Missing token", StatusCode::BAD_REQUEST))?;
    let ics = data["ics"].as_str().ok_or_else(|| poem::Error::from_string("ERROR: Missing ics", StatusCode::BAD_REQUEST))?;

        let id = get_user_id_from_token(pool, token)
    .await
    .map_err(|_| poem::Error::from_string("ERROR: Cannot find user from token", StatusCode::UNAUTHORIZED))?;

    sqlx::query(
        "UPDATE users
         SET user_ics = $2
         WHERE user_id = $1;
        "
    )
    .bind(id)
    .bind(ics)
    .execute(pool)
    .await
    .map_err(internal_err)?;

    Ok(Json(json!({"result": "updated"})))
    
}


#[handler]
pub async fn get_possible_ride(Data(pool): Data<&PgPool>, Json(token_json): Json<Value>) -> Result<Json<Value>> {

    let id_user = get_user_id_from_token(pool, token_json["token"]
    .as_str()
    .ok_or_else(|| poem::Error::from_string("ERROR: Missing token", StatusCode::BAD_REQUEST))?)
    .await?;

    let (lat, lng): (f64, f64) = sqlx::query_as(
        "SELECT lat, lng FROM users WHERE user_id = $1"
    )
    .bind(id_user)
    .fetch_one(pool)
    .await
    .map_err(internal_err)?;


    get_users_near(Data(pool), lat, lng, DEFAULT_RADIUS, id_user).await
}


#[handler]
pub async fn auth(Data(pool): Data<&PgPool>, Json(auth_json): Json<Value>) -> Result<Json<Value>> {

    let tel = auth_json["tel"].as_str().ok_or_else(|| poem::Error::from_string("ERROR: Missing tel", StatusCode::BAD_REQUEST))?;
    let passwd = auth_json["passwd"].as_str().ok_or_else(|| poem::Error::from_string("ERROR: Missing passwd", StatusCode::BAD_REQUEST))?;

    // Le hash argon2 contient un sel aléatoire : on récupère le hash stocké et on le vérifie (re-hasher ne donne jamais le même résultat)
    let row: Option<(i32, String)> = sqlx::query_as(
        "SELECT user_id, user_passwd FROM users WHERE user_tel = $1"
    )
    .bind(tel)
    .fetch_optional(pool)
    .await
    .map_err(internal_err)?;

    let (id, passwd_hash) = row.ok_or_else(|| poem::Error::from_status(StatusCode::UNAUTHORIZED))?;

    Argon2::default()
        .verify_password(passwd.as_bytes(), passwd_hash.as_str())
        .map_err(|_| poem::Error::from_status(StatusCode::UNAUTHORIZED))?;

    // Seul le hash du token est stocké en base : impossible de renvoyer l'ancien, on en crée un nouveau
    create_session(pool, id).await
}


#[handler]
pub async fn create_ride(Data(pool): Data<&PgPool>, Json(json): Json<Value>) -> Result<Json<Value>> {

    let token = json["token"].as_str().ok_or_else(|| poem::Error::from_string("ERROR: Missing token", StatusCode::BAD_REQUEST))?;
    let ride_start_str = json["ride_start"].as_str().ok_or_else(|| poem::Error::from_string("ERROR: Missing ride_start", StatusCode::BAD_REQUEST))?;
    let ride_goal_time_str = json["ride_goal_time"].as_str().ok_or_else(|| poem::Error::from_string("ERROR: Missing ride_goal_time", StatusCode::BAD_REQUEST))?;
    let lat_start = json["lat_start"].as_f64().ok_or_else(|| poem::Error::from_string("ERROR: Missing lat_start", StatusCode::BAD_REQUEST))?;
    let lng_start = json["lng_start"].as_f64().ok_or_else(|| poem::Error::from_string("ERROR: Missing lng_start", StatusCode::BAD_REQUEST))?;
    let lat_end = json["lat_end"].as_f64().ok_or_else(|| poem::Error::from_string("ERROR: Missing lat_end", StatusCode::BAD_REQUEST))?;
    let lng_end = json["lng_end"].as_f64().ok_or_else(|| poem::Error::from_string("ERROR: Missing lng_end", StatusCode::BAD_REQUEST))?;
    let ride_type = json["type"].as_i64().ok_or_else(|| poem::Error::from_string("ERROR: Missing type", StatusCode::BAD_REQUEST))?;

    if ride_type < 0 || ride_type > 3 {
        return Err(poem::Error::from_string("ERROR: Invalid ride type", StatusCode::BAD_REQUEST));
    }

    let id_user = get_user_id_from_token(pool, token)
        .await
        .map_err(|_| poem::Error::from_string("ERROR: Cannot find user from token", StatusCode::UNAUTHORIZED))?;

    let ride_start: DateTime<Utc> = ride_start_str.parse()
        .map_err(|_| poem::Error::from_string("ERROR: Invalid format for ride_start", StatusCode::BAD_REQUEST))?;
    let ride_goal_time: DateTime<Utc> = ride_goal_time_str.parse()
        .map_err(|_| poem::Error::from_string("ERROR: Invalid format for ride_goal_time", StatusCode::BAD_REQUEST))?;

    let (ride_id,): (i32,) = sqlx::query_as(
        "INSERT INTO ride (user_id, ride_start, ride_goal_time, lat_start, lng_start, lat_end, lng_end, type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING ride_id"
    )
    .bind(id_user)
    .bind(ride_start)
    .bind(ride_goal_time)
    .bind(lat_start)
    .bind(lng_start)
    .bind(lat_end)
    .bind(lng_end)
    .bind(ride_type as i32)
    .fetch_one(pool)
    .await
    .map_err(internal_err)?;

    Ok(Json(json!({ "ride_id": ride_id })))

}

async fn get_user_id_from_token(pool: &PgPool, token: &str) -> Result<i32> {
    let row: Option<(i32,)> = sqlx::query_as(
        "SELECT user_id FROM sessions WHERE token_hash = sha256($1) AND expires_at > now()"
    )
    .bind(token.as_bytes())
    .fetch_optional(pool)
    .await
    .map_err(internal_err)?;

    row.map(|(id,)| id)
        .ok_or_else(|| poem::Error::from_status(StatusCode::UNAUTHORIZED))
}


async fn create_session(pool: &PgPool, user_id: i32) -> Result<Json<Value>> {
    let mut bytes = [0u8; 32];
    getrandom::fill(&mut bytes).map_err(internal_err)?;
    let token = hex::encode(bytes);

    // Une seule session active par user : on supprime les anciennes (expirées ou non)
    sqlx::query("DELETE FROM sessions WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await
        .map_err(internal_err)?;

    let (expires_at,): (DateTime<Utc>,) = sqlx::query_as(
        "INSERT INTO sessions (token_hash, user_id)
         VALUES (sha256($1), $2)
         RETURNING expires_at"
    )
    .bind(token.as_bytes())
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(internal_err)?;

    Ok(Json(json!({ "token": token, "expires_at": expires_at })))
}


async fn get_users_near(Data(pool): Data<&PgPool>, lat: f64, lng: f64, radius: f64, exclude_id: i32) -> Result<Json<Value>> {
    let users: Vec<(f64, f64)> = sqlx::query_as::<_, (f64, f64)>(
        "SELECT lat, lng
         FROM users
         WHERE user_id <> $4
           AND earth_distance(ll_to_earth(lat, lng), ll_to_earth($1, $2)) < $3"
    )
    .bind(lat)
    .bind(lng)
    .bind(radius)
    .bind(exclude_id)
    .fetch_all(pool)
    .await
    .map_err(internal_err)?;

    let result: Vec<Value> = users.into_iter()
        .map(|(lat, lng)| json!({ "lat": lat, "lng": lng }))
        .collect();

    Ok(Json(json!({ "users_pos": result })))
}