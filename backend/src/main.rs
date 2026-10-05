//! Exemple de base avec poem.
//!
//! Tester (serveur sur localhost:8000) :
//!   curl localhost:8000/ping
//!   curl -X POST localhost:8000/create_user -H 'Content-Type: application/json' -d '{"jwt":"token1","name":"Mattin","tel":"0601020304","passwd":"secret"}'
//!   curl -X POST localhost:8000/fill_user -H 'Content-Type: application/json' -d '{"jwt":"token1","name":"Mattin","tel":"0611111111","passwd":"nouveau"}'
//!   curl -X POST localhost:8000/get_user_info -H 'Content-Type: application/json' -d '{"id":1}'
//!

use argon2::{Argon2, password_hash::PasswordHasher};
use poem::{
    EndpointExt, Result, Route, Server, get, handler, post,
    http::StatusCode,
    listener::TcpListener,
    web::{Data, Json},
};
use serde::{Deserialize}; // Deserialize pour lire, Serialize pour renvoyer.
use serde_json::{json, Value};
use sqlx::{PgPool, postgres::PgPoolOptions};


mod utils;
use utils::db_creation::create_db;



#[derive(Deserialize)]
struct Person {
    jwt: String,
    name: String,
    tel: String,
    passwd: String,
}

// Log l'erreur côté serveur, renvoie une 500 sans détails au client
fn internal_err(e: impl std::fmt::Display) -> poem::Error {
    eprintln!("ERROR: {e}");
    StatusCode::INTERNAL_SERVER_ERROR.into()
}

fn hash(passwd: &str) -> Result<String> {
    Ok(Argon2::default().hash_password(passwd.as_bytes()).map_err(internal_err)?.to_string())
}

#[handler]
async fn fill_user(Json(user): Json<Person>, Data(pool): Data<&PgPool>) -> Result<Json<Value>> {
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
async fn create_user(Data(pool): Data<&PgPool>, Json(user): Json<Person>) -> Result<Json<Value>> {

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
async fn ping(Data(pool): Data<&PgPool>) -> Result<Json<Value>> {

    let (version,): (String,) = sqlx::query_as("SELECT version()")
        .fetch_one(pool)
        .await
        .map_err(internal_err)?;

    print!("PostgreSQL version: {}", version);

    Ok(Json(json!({ "result": version })))
}

#[handler]
async fn get_user_info(Data(pool): Data<&PgPool>, Json(id_json): Json<Value>) -> Result<Json<Value>> {
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



#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let database_url = std::env::var("DATABASE_URL")?;

    // Pool de connexions
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    create_db(&pool).await?;

    // Déclaration des routes : chemin -> méthode HTTP (get/post/put/delete) -> handler
    let app = Route::new()
        .at("/fill_user", post(fill_user))
        .at("/create_user", post(create_user))
        .at("/get_user_info", post(get_user_info))
        .at("/ping", get(ping))
        .data(pool); // rend le pool accessible via Data<&PgPool>

    println!("SERVER: écoute sur 0.0.0.0:8000");
    Server::new(TcpListener::bind("0.0.0.0:8000"))
        .run(app)
        .await?;

    Ok(())
}
