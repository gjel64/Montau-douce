## API SERVEUR

```
/ping (GET) -> version                                       : ping db, renvoie la version PostgreSQL  

/create_user(name, tel, passwd) (POST) -> token, expires_at  : crée un nouvel utilisateur (409 si le tel existe déjà)
/fill_user_loc(token, lat, lng) (POST) -> result             : fill user lat and lng from id
/fill_user_ics(token, ics) (POST)                            : fill user ics from id 

/auth(tel, passwd) (POST) -> token, expires_at               : verif mdp et crée un nouveau token, l'ancien devient invalide (401 si invalide)

/create_ride(token, ride_start, ride_goal_time, lat_start, lng_start, lat_end, lng_end, type) (POST) -> ride_id        : create ride
/get_possible_ride(token, lat_end, lng_end, arrival_time?, radius?, lat_start?, lng_start?) (POST) -> rides[lat_end, lat_start, lng_start, lng_end, ride_id]     : find a ride
```

## INTERNE

```
get_user_id_from_token(token) -> id                         : renvoie l'id à partir du token (401 si invalide/expiré)
create_session(id) -> token, expires_at                     : supprime les anciennes sessions du user et crée un nouveau token
get_ride_near(lat_start, lng_start, radius, lat_end, lng_end, arrival_time?) -> rides : recherche les rides

hash(passwd) -> hash  
internal_err(e) -> 500
```