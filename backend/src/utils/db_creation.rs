use sqlx::PgPool;

use crate::utils::db_interaction::hash;

pub async fn create_db(pool: &PgPool) -> Result<(), sqlx::Error> {

    sqlx::query(
        "CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS users (
            user_id SERIAL PRIMARY KEY,
            user_name VARCHAR(255),
            user_tel VARCHAR(15),
            user_passwd VARCHAR(255),
            lat double precision,
            lng double precision,
            user_ics VARCHAR(255)
        )",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS stop (
            stop_id SERIAL PRIMARY KEY,
            lat double precision NOT NULL,
            lng double precision NOT NULL,
            user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE
        )",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS ride (
            ride_id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            ride_start TIMESTAMPTZ,
            ride_time INTERVAL,
            lat_start double precision NOT NULL,
            lng_start double precision NOT NULL,
            lat_end double precision NOT NULL,
            lng_end double precision NOT NULL
        )",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS ride_stop (
            ride_id INT NOT NULL REFERENCES ride(ride_id) ON DELETE CASCADE,
            stop_id INT NOT NULL REFERENCES stop(stop_id) ON DELETE CASCADE,
            stop_order INT NOT NULL,
            PRIMARY KEY (ride_id, stop_id),
            UNIQUE (ride_id, stop_order) DEFERRABLE INITIALLY DEFERRED
        )",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS sessions (
            token_hash BYTEA PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '60 days'
        );",
    ).execute(pool).await?;


    let passwd = hash("mdp").unwrap();
    // Fill with false values TODO: Delete it
    sqlx::query(
        "INSERT INTO users (user_name, user_tel, user_passwd, lat, lng)
         VALUES ('name1', '1234567890', $1, 43.4945144, -1.4736657),
                ('name2', '0987654321', $1, 43.48865617841056, -1.482401353452829),
                ('name3', '1112223333', $1, 43.48177175173004, -1.5097996424168958),
                ('name4', '4445556666', $1, 43.48602875354883, -1.490129772560247)"
    )
    .bind(passwd)
    .fetch_optional(pool)
    .await?;

    Ok(())
}