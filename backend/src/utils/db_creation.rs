use sqlx::PgPool;

pub async fn create_db(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS users (
            user_id SERIAL PRIMARY KEY,
            user_jwt VARCHAR(255) NOT NULL UNIQUE,
            user_name VARCHAR(255),
            user_tel VARCHAR(15),
            user_passwd VARCHAR(255),
            user_address VARCHAR(255),
            user_ics VARCHAR(255),

        )",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS stop (
            stop_id SERIAL PRIMARY KEY,
            stop_location VARCHAR(255) NOT NULL,
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
            ride_start_location VARCHAR(255),
            ride_end_location VARCHAR(255)
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

    Ok(())
}