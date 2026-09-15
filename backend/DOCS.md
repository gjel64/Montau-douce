## API SERVEUR

```
/ping (GET) -> version                                 : un ping à la bdd classique
/create_user(jwt) (POST) -> id                         : crée un nouvel user avec son jwt
/fill_user(id, name, tel, passwd) (POST) -> id         : fill les attr d'un user à partir de son id
```