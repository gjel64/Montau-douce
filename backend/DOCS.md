## API SERVEUR

```
/ping (GET) -> version                                       : ping db, renvoie la version PostgreSQL  

/create_user(name, tel, passwd) (POST) -> token, expires_at  : crée un nouvel utilisateur (409 si le tel existe déjà)
/fill_user_loc(token, lat, lng) (POST) -> result             : fill user lat and lng from id
/fill_user_ics(token, ics) (POST)                            : fill user ics from id TODO:

/auth(tel, passwd) (POST) -> token, expires_at               : verif mdp et crée un nouveau token, l'ancien devient invalide (401 si invalide)

/get_possible_ride(token) (POST) -> Json(list<lat, long>)    : à partir du token d'une personne, voit les ride qui sont à côté
```

## INTERNE

```
get_user_id_from_token(token) -> id                         : renvoie l'id à partir du token (401 si invalide/expiré)
create_session(id) -> token, expires_at                     : supprime les anciennes sessions du user et crée un nouveau token
get_users_near(lat, long) -> Json(list<name, tel>)          : renvoie name tel des personnes proches de lat long
```