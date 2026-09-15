//! Exemple de base avec poem.
//!
//! Tester (serveur sur localhost:8000) :
//!   curl localhost:8000/
//!   curl localhost:8000/hello/Mattin
//!   curl "localhost:8000/add?a=2&b=3"
//!   curl -X POST localhost:8000/echo -H 'Content-Type: application/json' -d '{"name":"Mattin","age":20}'
//!   curl localhost:8000/ping
//!   curl -i localhost:8000/error

use poem::{
    EndpointExt, Result, Route, Server, get, handler, post,
    http::StatusCode,
    listener::TcpListener,
    web::{Data, Json, Path, Query},
};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, postgres::PgPoolOptions};

// ---------------------------------------------------------------------------
// 1. Handler le plus simple : `#[handler]` transforme une fonction async en
//    endpoint. Tout type qui implémente `IntoResponse` peut être retourné
//    (&str, String, Json<T>, StatusCode, Result<T>, ...).
// ---------------------------------------------------------------------------
#[handler]
async fn index() -> &'static str {
    "Bonjour depuis poem !"
}

// ---------------------------------------------------------------------------
// 2. Paramètre dans l'URL : /hello/:name
//    Les "extracteurs" (Path, Query, Json, Data...) sont passés en arguments
//    et poem les remplit automatiquement à partir de la requête.
// ---------------------------------------------------------------------------
#[handler]
async fn hello(Path(name): Path<String>) -> String {
    format!("Salut {name} !")
}

// ---------------------------------------------------------------------------
// 3. Query string : /add?a=2&b=3
//    On décrit les paramètres attendus dans une struct `Deserialize`.
//    S'il en manque un ou s'il n'est pas du bon type -> 400 automatique.
// ---------------------------------------------------------------------------
#[derive(Deserialize)]
struct AddParams {
    a: i32,
    b: i32,
}

#[handler]
async fn add(Query(params): Query<AddParams>) -> String {
    (params.a + params.b).to_string()
}

// ---------------------------------------------------------------------------
// 4. Body JSON en entrée et JSON en sortie (POST)
//    `Deserialize` pour lire, `Serialize` pour renvoyer.
// ---------------------------------------------------------------------------
#[derive(Deserialize)]
struct Person {
    name: String,
    age: u32,
}

#[derive(Serialize)]
struct Greeting {
    message: String,
    adult: bool,
}

#[handler]
async fn echo(Json(person): Json<Person>) -> Json<Greeting> {
    Json(Greeting {
        message: format!("Bienvenue {}", person.name),
        adult: person.age >= 18,
    })
}

// ---------------------------------------------------------------------------
// 5. État partagé (ici le pool de connexions Postgres) avec `Data<&T>`.
//    Le pool est ajouté une seule fois avec `.data(pool)` dans main().
//    Retourner `Result<T>` permet d'utiliser `?` : l'erreur devient une 500.
//    Toujours passer les valeurs avec `.bind()` (jamais format!) -> pas
//    d'injection SQL.
// ---------------------------------------------------------------------------
#[derive(Serialize)]
struct PingResponse {
    result: String,
}

#[handler]
async fn ping(Data(pool): Data<&PgPool>) -> Result<Json<PingResponse>> {
    let (version,): (String,) = sqlx::query_as("SELECT version()")
        .fetch_one(pool)
        .await
        .map_err(|e| poem::Error::new(e, StatusCode::INTERNAL_SERVER_ERROR))?;

    Ok(Json(PingResponse { result: version }))
}

// ---------------------------------------------------------------------------
// 6. Renvoyer une erreur HTTP avec un code précis.
// ---------------------------------------------------------------------------
#[handler]
async fn error() -> Result<String> {
    Err(poem::Error::from_string(
        "ceci est une erreur volontaire",
        StatusCode::BAD_REQUEST,
    ))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let database_url = std::env::var("DATABASE_URL")?;

    // Pool de connexions : remplace le singleton Python
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    // Création de la table si elle n'existe pas (équivalent de create_db.py)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS users (
            user_id SERIAL PRIMARY KEY,
            user_jwt VARCHAR(255) NOT NULL,
            user_name VARCHAR(255),
            user_tel VARCHAR(15),
            user_passwd VARCHAR(255)
        )",
    )
    .execute(&pool)
    .await?;

    // Déclaration des routes : chemin -> méthode HTTP (get/post/put/delete) -> handler
    let app = Route::new()
        .at("/", get(index))
        .at("/hello/:name", get(hello))
        .at("/add", get(add))
        .at("/echo", post(echo))
        .at("/ping", get(ping))
        .at("/error", get(error))
        .data(pool); // rend le pool accessible via Data<&PgPool>

    println!("SERVER: écoute sur 0.0.0.0:8000");
    Server::new(TcpListener::bind("0.0.0.0:8000"))
        .run(app)
        .await?;

    Ok(())
}
