

/*
curl localhost:8000/ping
curl -X POST localhost:8000/create_user -H 'Content-Type: application/json' -d '{"name":"Mattin","tel":"0601020304","passwd":"secret"}'
curl -X POST localhost:8000/auth -H 'Content-Type: application/json' -d '{"tel":"0601020304","passwd":"secret"}'
curl -X POST localhost:8000/fill_user_loc -H 'Content-Type: application/json' -d '{"token" : "<token>", "lat":43.48865617841056, "lng":-1.482401353452829}'
curl -X POST localhost:8000/fill_user_ics -H 'Content-Type: application/json' -d '{"token" : "<token>", "ics":"test_ics"}'
curl -X POST localhost:8000/create_ride -H 'Content-Type: application/json' -d '{"token" : "<token>", "lat_start":43.48865617841056, "lng_start":-1.482401353452829, "ride_start":"2024-06-01T12:00:00Z", "lat_end":43.48865617841056, "lng_end":-1.482401353452829, "ride_goal_time":"2024-06-01T12:30:00Z", "type":0}'
curl -X POST localhost:8000/get_possible_ride -H 'Content-Type: application/json' -d '{"token" : "<token>", "lat_start":43.48865617841056, "lng_start":-1.482401353452829, "lat_end":43.48865617841056, "lng_end":-1.482401353452829, "arrival_time":"2024-06-01T12:30:00Z"}'
*/


use poem::{
    EndpointExt, Result, Route, Server, get, post,
    listener::TcpListener,
};
use sqlx::{postgres::PgPoolOptions};


mod utils;
use utils::db_creation::create_db;
use utils::db_interaction::{auth, create_user, ping, get_possible_ride, fill_user_loc, fill_user_ics, create_ride};


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
        .at("/ping", get(ping))
        .at("/get_possible_ride", post(get_possible_ride))
        .at("/fill_user_loc", post(fill_user_loc))
        .at("/fill_user_ics", post(fill_user_ics))
        .at("/create_ride", post(create_ride))
        .data(pool); // rend le pool accessible via Data<&PgPool>

    println!("SERVER: écoute sur 0.0.0.0:8000");
    Server::new(TcpListener::bind("0.0.0.0:8000"))
        .run(app)
        .await?;

    Ok(())
}
