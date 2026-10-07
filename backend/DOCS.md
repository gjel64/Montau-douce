## API SERVEUR

```
/ping (GET) -> version                                           : ping db, renvoie la version PostgreSQL  

/create_user(name, tel, passwd) (POST) -> token, expires_at    : crée un nouvel utilisateur (409 si le tel existe déjà)
/auth(tel, passwd) (POST) -> token, expires_at                  : vérifie le mot de passe et crée un nouveau token, l'ancien devient invalide (401 si invalide)
/fill_user_loc(token, lat, long) (POST)                        : fill user lat and long from id TODO:
/fill user_ics(token, ics) (POST)                               : fill user ics from id TODO:
/get_user_info(id) (POST) -> name, tel                    : renvoie les infos d'un user à partir de son id
/get_possible_ride(token) (POST) -> Json(list<name, tel>)    : à partir du token d'une personne, voit les ride qui sont à côté TODO: 
```

## INTERNE

```
get_user_id_from_token(token) -> id                         : renvoie l'id à partir du token (401 si invalide/expiré)
create_session(id) -> token, expires_at                     : supprime les anciennes sessions du user et crée un nouveau token
get_users_near(lat, long) -> Json(list<name, tel>)          : renvoie name tel des personnes proches de lat long
```