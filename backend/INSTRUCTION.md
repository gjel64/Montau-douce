## Lancer le projet
```bash
docker compose up --build
```

## Arrêter
```bash
docker compose down
```
Supprimer aussi les données de la base :
```bash
docker compose down -v
```

## Relancer (sans reconstruire)
```bash
docker compose up
```

## Accéder à la base PostgreSQL
```bash
docker compose exec db psql -U user -d montaudouce
```

## Voir les logs de l'app
```bash
docker compose logs -f app
```

## Notes
- Reconstruire (`--build`) seulement si `requirements.txt` change.
- L'app se connecte à la base via `db` (nom du service), pas `localhost`.