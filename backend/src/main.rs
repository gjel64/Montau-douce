//! Exemple de base avec poem.
//!
//! Tester (serveur sur localhost:8000) :
//!   curl localhost:8000/ping
//!   curl -X POST localhost:8000/fill_user -H 'Content-Type: application/json' -d '{"name":"Mattin","tel":"1234567890","passwd":"password", "jwt":"token1"}'
//!   curl -X POST localhost:8000/create_user -H 'Content-Type: application/json' -d '{"jwt":"token","name":"NULL","tel":"NULL","passwd":"NULL"}'
//!   curl -X POST localhost:8000/get_user_info -H 'Content-Type: application/json' -d '{"id":1}'
//! 

use poem::{
    EndpointExt, Result, Route, Server, get, handler, post,
    http::StatusCode,
    listener::TcpListener,
    web::{Data, Json},
};
use serde::{Deserialize}; // Deserialize pour lire, Serialize pour renvoyer.
use serde_json::{json, Value};
use sqlx::{PgPool, postgres::PgPoolOptions};



#[derive(Deserialize)]
struct Person {
    #[serde(default)] // rend id optionnel
    id: Option<u32>,
    jwt: String,
    name: String,
    tel: String,
    passwd: String,
}

#[handler]
async fn fill_user(Json(user): Json<Person>, Data(pool): Data<&PgPool>) -> Result<Json<Value>> {
    let id = match user.id {
        Some(id) => id as i32,
        None => get_id_from_jwt(pool, &user.jwt)
            .await?
            .ok_or_else(|| poem::Error::from_string("ERROR: User not found", StatusCode::NOT_FOUND))?,
    };

    let (result,) : (i32,) = sqlx::query_as(
        "UPDATE users
         SET user_name = $1, user_tel = $2, user_passwd = $3
         WHERE user_id = $4
         RETURNING user_id"
    )
    .bind(&user.name)
    .bind(&user.tel)
    .bind(&user.passwd)
    .bind(id as i32)
    .fetch_one(pool)
    .await
    .map_err(|e| poem::Error::new(e, StatusCode::INTERNAL_SERVER_ERROR))?;

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
    .bind(&user.passwd)
    .fetch_one(pool)
    .await
    .map_err(|e| poem::Error::new(e, StatusCode::INTERNAL_SERVER_ERROR))?;

    Ok(Json(json!({ "id": id })))
}

async fn get_id_from_jwt(pool: &PgPool, jwt: &str) -> Result<Option<i32>> {
    let result = sqlx::query_as::<_, (i32,)>(
        "SELECT user_id FROM users WHERE user_jwt = $1"
    )
    .bind(jwt)
    .fetch_optional(pool)
    .await
    .map_err(|e| poem::Error::new(e, StatusCode::INTERNAL_SERVER_ERROR))?;

    Ok(result.map(|(id,)| id))
}


#[handler]
async fn ping(Data(pool): Data<&PgPool>) -> Result<Json<Value>> {

    let (version,): (String,) = sqlx::query_as("SELECT version()")
        .fetch_one(pool)
        .await
        .map_err(|e| poem::Error::new(e, StatusCode::INTERNAL_SERVER_ERROR))?;

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
        

    let (name, tel, passwd): (String, String, String) = sqlx::query_as(
        "SELECT user_name, user_tel, user_passwd FROM users WHERE user_id = $1"
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(|e| poem::Error::new(e, StatusCode::INTERNAL_SERVER_ERROR))?;

    Ok(Json(json!({ "name": name, "tel": tel, "passwd": passwd })))
}



#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let database_url = std::env::var("DATABASE_URL")?;

    // Pool de connexions
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS users (
            user_id SERIAL PRIMARY KEY,
            user_jwt VARCHAR(255) NOT NULL UNIQUE,
            user_name VARCHAR(255),
            user_tel VARCHAR(15),
            user_passwd VARCHAR(255)
        )",
    )
    .execute(&pool)
    .await
    .map_err(|e| poem::Error::new(e, StatusCode::INTERNAL_SERVER_ERROR))?;

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
