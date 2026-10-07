

/*
curl localhost:8000/ping
curl -X POST localhost:8000/create_user -H 'Content-Type: application/json' -d '{"name":"Mattin","tel":"0601020304","passwd":"secret"}'
curl -X POST localhost:8000/auth -H 'Content-Type: application/json' -d '{"tel":"0601020304","passwd":"secret"}'
curl -X POST localhost:8000/get_user_info -H 'Content-Type: application/json' -d '{"id":1}'
curl -X POST localhost:8000/get_possible_ride -H 'Content-Type: application/json' -d '{"token":"<token>"}'
*/


use poem::{
    EndpointExt, Result, Route, Server, get, post,
    listener::TcpListener,
};
use sqlx::{postgres::PgPoolOptions};


mod utils;
use utils::db_creation::create_db;
use utils::db_interaction::{auth, create_user, get_user_info, ping, get_possible_ride};


#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let database_url = std::env::var("DATABASE_URL")?;

    // Pool de connexions
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    match create_db(&pool).await {
        Ok(_) => println!("SERVER: Database created successfully"),
        Err(e) => eprintln!("SERVER ERROR: Failed to create database: {e}"),
    }

    // Déclaration des routes : chemin -> méthode HTTP (get/post/put/delete) -> handler
    let app = Route::new()
        .at("/create_user", post(create_user))
        .at("/auth", post(auth))
        .at("/get_user_info", post(get_user_info))
        .at("/ping", get(ping))
        .at("/get_possible_ride", post(get_possible_ride))
        .data(pool); // rend le pool accessible via Data<&PgPool>

    println!("SERVER: écoute sur 0.0.0.0:8000");
    Server::new(TcpListener::bind("0.0.0.0:8000"))
        .run(app)
        .await?;

    Ok(())
}
