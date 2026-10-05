use sqlx::PgPool;

pub async fn create_db(pool: &PgPool) -> Result<(), sqlx::Error> {

    sqlx::query(
        "CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS users (
            user_id SERIAL PRIMARY KEY,
            user_jwt VARCHAR(255) NOT NULL UNIQUE,
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


    // Fill with false values TODO: Delete it
    sqlx::query(
        "INSERT INTO users (user_jwt, user_name, user_tel, user_passwd, lat, lng)
         VALUES ('123', 'name1', '1234567890', 'passwd1', 43.4945144, -1.4736657),
                ('456', 'name2', '0987654321', 'passwd2', 43.48865617841056, -1.482401353452829),
                ('789', 'name3', '1112223333', 'passwd3', 43.48177175173004, -1.5097996424168958),
                ('abc', 'name4', '4445556666', 'passwd4', 43.48602875354883, -1.490129772560247)"
    ).execute(pool)
    .await?;

    Ok(())
}