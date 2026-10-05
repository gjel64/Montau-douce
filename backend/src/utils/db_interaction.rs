use argon2::{Argon2, password_hash::PasswordHasher};
use poem::{
    Result, handler,
    http::StatusCode,
    web::{Data, Json},
};
use serde::{Deserialize}; // Deserialize pour lire, Serialize pour renvoyer.
use serde_json::{json, Value};
use sqlx::{PgPool};


#[derive(Deserialize)]
struct Person {
    jwt: String,
    name: String,
    tel: String,
    passwd: String,
}

// Log l'erreur côté serveur, renvoie une 500 sans détails au client
fn internal_err(e: impl std::fmt::Display) -> poem::Error {
    eprintln!("SERVER ERROR: {e}");
    StatusCode::INTERNAL_SERVER_ERROR.into()
}

fn hash(passwd: &str) -> Result<String> {
    Ok(Argon2::default().hash_password(passwd.as_bytes()).map_err(internal_err)?.to_string())
}

const DEFAULT_RADIUS: f64 = 1000.0; // 1km radius search for nearby users TODO: change it

#[handler]
pub async fn fill_user(Json(user): Json<Person>, Data(pool): Data<&PgPool>) -> Result<Json<Value>> {
    // id toujours déduit du jwt : on ne modifie que son propre compte
    let (result,) = sqlx::query_as::<_, (i32,)>(
        "UPDATE users
         SET user_name = $1, user_tel = $2, user_passwd = $3
         WHERE user_jwt = $4
         RETURNING user_id"
    )
    .bind(&user.name)
    .bind(&user.tel)
    .bind(hash(&user.passwd)?)
    .bind(&user.jwt)
    .fetch_optional(pool)
    .await
    .map_err(internal_err)?
    .ok_or_else(|| poem::Error::from_string("ERROR: User not found", StatusCode::NOT_FOUND))?;

    Ok(Json(json!({ "result": result })))
}

#[handler]
pub async fn create_user(Data(pool): Data<&PgPool>, Json(user): Json<Person>) -> Result<Json<Value>> {

    let (id,): (i32,) = sqlx::query_as(
        "INSERT INTO users (user_jwt, user_name, user_tel, user_passwd)
         VALUES ($1, $2, $3, $4)
         RETURNING user_id"
    )
    .bind(&user.jwt)
    .bind(&user.name)
    .bind(&user.tel)
    .bind(hash(&user.passwd)?)
    .fetch_one(pool)
    .await
    .map_err(internal_err)?;

    Ok(Json(json!({ "id": id })))
}

async fn get_id_from_jwt(pool: &PgPool, jwt: &str) -> Result<Option<i32>> {
    let result = sqlx::query_as::<_, (i32,)>(
        "SELECT user_id FROM users WHERE user_jwt = $1"
    )
    .bind(jwt)
    .fetch_optional(pool)
    .await
    .map_err(internal_err)?;

    Ok(result.map(|(id,)| id))
}


#[handler]
pub async fn ping(Data(pool): Data<&PgPool>) -> Result<Json<Value>> {

    let (version,): (String,) = sqlx::query_as("SELECT version()")
        .fetch_one(pool)
        .await
        .map_err(internal_err)?;

    print!("PostgreSQL version: {}", version);

    Ok(Json(json!({ "result": version })))
}

#[handler]
pub async fn get_user_info(Data(pool): Data<&PgPool>, Json(id_json): Json<Value>) -> Result<Json<Value>> {
    let id = match id_json["id"].as_i64().map(|v| v as i32).filter(|&id| id > 0) {
        Some(id) => id,
        None => {
            let jwt = id_json["jwt"].as_str().ok_or_else(|| poem::Error::from_string("ERROR: Missing JWT or ID", StatusCode::BAD_REQUEST))?;
            get_id_from_jwt(pool, jwt)
                .await?
                .ok_or_else(|| poem::Error::from_string("ERROR: User not found", StatusCode::NOT_FOUND))?
        }
    };


    let (name, tel): (String, String) = sqlx::query_as(
        "SELECT user_name, user_tel FROM users WHERE user_id = $1"
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(internal_err)?;

    Ok(Json(json!({ "name": name, "tel": tel })))
}


pub async fn get_users_near(Data(pool): Data<&PgPool>, lat: f64, lng: f64, radius: f64) -> Result<Json<Value>> {
    let users = sqlx::query_as::<_, (String, String)>(
        "SELECT user_name, user_tel
         FROM users
         WHERE earth_distance(ll_to_earth(lat, lng), ll_to_earth($1, $2)) < $3"
    )
    .bind(lat)
    .bind(lng)
    .bind(radius)
    .fetch_all(pool)
    .await
    .map_err(internal_err)?;

    let result: Vec<Value> = users.into_iter()
        .map(|(name, tel)| json!({ "name": name, "tel": tel }))
        .collect();

    Ok(Json(json!({ "users": result })))

}


#[handler]
pub async fn get_possible_ride(Data(pool): Data<&PgPool>, Json(id_user): Json<Value>) -> Result<Json<Value>> {
    let id = match id_user["id"].as_i64().map(|v| v as i32).filter(|&id| id > 0) {
        Some(id) => id,
        None => {
            let jwt = id_user["jwt"].as_str().ok_or_else(|| poem::Error::from_string("ERROR: Missing JWT or ID", StatusCode::BAD_REQUEST))?;
            get_id_from_jwt(pool, jwt)
                .await?
                .ok_or_else(|| poem::Error::from_string("ERROR: User not found", StatusCode::NOT_FOUND))?
        }
    };

    let (lat, lng): (f64, f64) = sqlx::query_as(
        "SELECT lat, lng FROM users WHERE user_id = $1"
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(internal_err)?;

    get_users_near(Data(pool), lat, lng, DEFAULT_RADIUS).await
}