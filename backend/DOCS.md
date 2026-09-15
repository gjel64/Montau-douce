## API SERVEUR

```
/ping (GET) -> version                                 : ping db
/create_user(jwt) (POST) -> id                         : create new user from jwt
/fill_user(id, name, tel, passwd) (POST) -> id         : fill user attributes from id
/user_id_from_jwt(jwt) (GET) -> id                     : get id of the user from jwt
/user_info_from_id(id) (GET) -> user_infos             : return user infos from id
```