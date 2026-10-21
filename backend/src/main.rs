

/*
curl localhost:8000/ping
curl -X POST localhost:8000/create_user -H 'Content-Type: application/json' -d '{"name":"Mattin","tel":"0601020304","passwd":"secret"}'
curl -X POST localhost:8000/auth -H 'Content-Type: application/json' -d '{"tel":"0601020304","passwd":"secret"}'
curl -X POST localhost:8000/get_my_infos -H 'Content-Type: application/json' -d '{"token" : "<token>"}'
curl -X POST localhost:8000/set_my_infos -H 'Content-Type: application/json' -d '{"token" : "<token>", "user_name":"Mattin2","user_tel":"0601234567","passwd":"secret2"}'
curl -X POST localhost:8000/create_ride -H 'Content-Type: application/json' -d '{"token" : "<token>", "lat_start":43.48865617841056, "lng_start":-1.482401353452829, "ride_start":"2024-06-01T12:00:00Z", "lat_end":43.48865617841056, "lng_end":-1.482401353452829, "ride_goal_time":"2024-06-01T12:30:00Z", "type":0}'
curl -X POST localhost:8000/get_possible_ride -H 'Content-Type: application/json' -d '{"token" : "<token>", "lat_start":43.48865617841056, "lng_start":-1.482401353452829, "lat_end":43.48865617841056, "lng_end":-1.482401353452829, "arrival_time":"2024-06-01T12:30:00Z"}'
curl -X POST localhost:8000/create_stop -H 'Content-Type: application/json' -d '{"token" : "<token>", "ride_id":1, "stop_lat":43.48865617841056, "stop_lng":-1.482401353452829, "status":0, "stop_order":4}'
curl -X POST localhost:8000/get_ride_infos -H 'Content-Type: application/json' -d '{"token" : "<token>", "ride_id":1}'

curl -X POST localhost:8000/delete_ride -H 'Content-Type: application/json' -d '{"token" : "<token>", "ride_id":1}'
curl -X POST localhost:8000/delete_user -H 'Content-Type: application/json' -d '{"token" : "<token>"}'
*/


use poem::{
    EndpointExt, Result, Route, Server, get, post,
    listener::TcpListener,
};
use sqlx::{postgres::PgPoolOptions};
use poem::middleware::Cors;


mod utils;
use utils::db_creation::create_db;
use utils::db_interaction::{auth, create_user, ping, get_possible_ride, create_ride, delete_user, get_my_infos, create_stop, get_ride_infos, delete_ride, set_my_infos};


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
        .at("/create_ride", post(create_ride))
        .at("/delete_user", post(delete_user))
        .at("/get_my_infos", post(get_my_infos))
        .at("/create_stop", post(create_stop))
        .at("/get_ride_infos", post(get_ride_infos))
        .at("/delete_ride", post(delete_ride))
        .at("/set_my_infos", post(set_my_infos))
        .with(Cors::new())
        .data(pool); // rend le pool accessible via Data<&PgPool>

    println!("SERVER: écoute sur 0.0.0.0:8000");
    Server::new(TcpListener::bind("0.0.0.0:8000"))
        .run(app)
        .await?;

    Ok(())
}
