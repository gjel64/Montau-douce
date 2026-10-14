use sqlx::PgPool;

use crate::utils::db_interaction::hash;

#[derive(Debug, Clone, Copy, PartialEq, Eq, sqlx::Type)]
#[repr(i32)]
pub enum RideType {
    Car = 0,
    Bike = 1,
    Bus = 2,
    Walk = 3,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, sqlx::Type)]
#[repr(i32)]
pub enum StopStatus {
    OnDemand = 0,
    Accepted = 1,
    Canceled = 2,
}




pub async fn create_db(pool: &PgPool) -> Result<(), sqlx::Error> {

    sqlx::query(
        "CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS users (
            user_id SERIAL PRIMARY KEY,
            user_name VARCHAR(255) UNIQUE NOT NULL,
            user_tel VARCHAR(16) UNIQUE NOT NULL,
            user_passwd VARCHAR(255),
            lat double precision,
            lng double precision,
            user_ics VARCHAR(255)
        )",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS ride (
            ride_id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            ride_start TIMESTAMPTZ,
            ride_goal_time TIMESTAMPTZ,
            lat_start double precision NOT NULL,
            lng_start double precision NOT NULL,
            lat_end double precision NOT NULL,
            lng_end double precision NOT NULL,
            type INT NOT NULL
        )",
    )
    .execute(pool)
    .await?;
    /* type {
        0 : car
        1 : bike
        2 : bus
        3 : walk
    } */

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS ride_stop (
            stop_id SERIAL,
            ride_id INT NOT NULL REFERENCES ride(ride_id) ON DELETE CASCADE,
            user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            stop_lat double precision NOT NULL,
            stop_lng double precision NOT NULL,
            stop_order INT NOT NULL,
            status INT NOT NULL,
            PRIMARY KEY (ride_id, stop_id),
            UNIQUE (ride_id, stop_order) DEFERRABLE INITIALLY DEFERRED
        )",
    )
    .execute(pool)
    .await?;
    /* status {
        0 : on demand
        1 : accepted
        2 : canceled
    } */

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS sessions (
            token_hash BYTEA PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '60 days'
        );",
    ).execute(pool).await?;


    seed_fake_data(pool).await?;


    Ok(())
}


async fn seed_fake_data(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Évite l'erreur UNIQUE aux redémarrages
    if sqlx::query_scalar::<_, bool>("SELECT EXISTS (SELECT 1 FROM users)")
        .fetch_one(pool)
        .await?
    {
        return Ok(());
    }
 
    let passwd = hash("mdp").unwrap();
    sqlx::query(
        "INSERT INTO users (user_name, user_tel, user_passwd, lat, lng) VALUES
            ('name1', '1234567890', $1, 43.4945144, -1.4736657),
            ('name2', '0987654321', $1, 43.48865617841056, -1.482401353452829),
            ('name3', '1112223333', $1, 43.48177175173004, -1.5097996424168958),
            ('name4', '4445556666', $1, 43.48602875354883, -1.490129772560247)",
    )
    .bind(passwd)
    .execute(pool)
    .await?;
 
    // Trajets : demain / après-demain (Bayonne -> Biarritz, Anglet -> gare de Bayonne)
    sqlx::query(
        "INSERT INTO ride (user_id, ride_start, ride_goal_time, lat_start, lng_start, lat_end, lng_end, type)
         SELECT user_id, d + t1, d + t2, 43.4945144, -1.4736657, 43.4832, -1.5586, 0
           FROM users, (SELECT date_trunc('day', now() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris' + interval '1 day') x(d),
                (VALUES (interval '7 hours 40 minutes', interval '8 hours 10 minutes')) v(t1, t2)
          WHERE user_name = 'name1'
         UNION ALL
         SELECT user_id, d + t1, d + t2, 43.48177175173004, -1.5097996424168958, 43.4966, -1.4700, 1
           FROM users, (SELECT date_trunc('day', now() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris' + interval '2 days') x(d),
                (VALUES (interval '17 hours 30 minutes', interval '17 hours 55 minutes')) v(t1, t2)
          WHERE user_name = 'name3'",
    )
    .execute(pool)
    .await?;
 
    // Arrêts : un par statut sur le trajet 1, un en attente sur le trajet 2
    sqlx::query(
        "INSERT INTO ride_stop (ride_id, user_id, stop_lat, stop_lng, stop_order, status)
         SELECT r.ride_id, u.user_id, u.lat, u.lng, s.ord, s.status
           FROM (VALUES (1, 'name2', 1, 1), (1, 'name4', 2, 0), (1, 'name3', 3, 2),
                        (2, 'name4', 1, 0)) s(rn, uname, ord, status)
           JOIN (SELECT ride_id, row_number() OVER (ORDER BY ride_id) rn FROM ride) r ON r.rn = s.rn
           JOIN users u ON u.user_name = s.uname",
    )
    .execute(pool)
    .await?;
 
    Ok(())
}