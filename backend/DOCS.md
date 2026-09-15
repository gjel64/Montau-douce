## API SERVEUR

```
/ping (GET) -> version                                           : ping db, renvoie la version PostgreSQL
/create_user(jwt, name, tel, passwd) (POST) -> id                : crée un nouvel utilisateur
/fill_user(id?, jwt, name, tel, passwd) (POST) -> id             : met à jour les attributs d'un user (id déduit du jwt si absent)
/get_user_info(id?, jwt?) (POST) -> name, tel, passwd            : renvoie les infos d'un user à partir de son id
```

## INTERNE

```
get_id_from_jwt(jwt) -> id                     : renvoie l'id à partir du jwt
```