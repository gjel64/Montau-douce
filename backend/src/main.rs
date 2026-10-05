//! Exemple de base avec poem.
//!
//! Tester (serveur sur localhost:8000) :
//!   curl localhost:8000/ping
//!   curl -X POST localhost:8000/create_user -H 'Content-Type: application/json' -d '{"jwt":"token1","name":"Mattin","tel":"0601020304","passwd":"secret"}'
//!   curl -X POST localhost:8000/fill_user -H 'Content-Type: application/json' -d '{"jwt":"token1","name":"Mattin","tel":"0611111111","passwd":"nouveau"}'
//!   curl -X POST localhost:8000/get_user_info -H 'Content-Type: application/json' -d '{"id":1}'
//!

use poem::{
    EndpointExt, Result, Route, Server, get, post,
    listener::TcpListener,
};
use sqlx::{postgres::PgPoolOptions};


mod utils;
use utils::db_creation::create_db;
use utils::db_interaction::{fill_user, create_user, get_user_info, ping};


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
