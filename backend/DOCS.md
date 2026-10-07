## API SERVEUR

```
/ping (GET) -> version                                           : ping db, renvoie la version PostgreSQL  

/create_user(name, tel, passwd) (POST) -> id                : crée un nouvel utilisateur
/fill_user_loc(id, lat, long) (POST)                        : fill user lat and long from id TODO:
/fill user_ics(id, ics) (POST)                               : fill user ics from id TODO:
/get_user_info(id) (POST) -> name, tel                    : renvoie les infos d'un user à partir de son id
/get_possible_ride(id) (POST) -> Json(list<name, tel>)       : à partir de l'id d'une personne, voit les ride qui sont à côté TODO: 
```

## INTERNE

```
get_users_near(lat, long) -> Json(list<name, tel>)          : renvoie name tel des personnes proches de lat long
```