import os
import psycopg2
from fastapi import FastAPI
from app.DBConnection import DBConnection
from app.create_db import create_db

app = FastAPI()

@app.get("/ping")
def ping_db():
    connexion = DBConnection.getConnection()
    cursor = connexion.cursor()
    cursor.execute("SELECT version();")
    version = cursor.fetchone()
    return {"postgres_version": version}

@app.post("/create_user")
def create_user(jwt: str):
    connexion = DBConnection.getConnection()
    cursor = connexion.cursor()
    try:
        cursor.execute(
            f"INSERT INTO users(user_jwt) VALUES ('{jwt}') RETURNING user_id;",
        )
        res = cursor.fetchone()
        connexion.commit()
        cursor.close()
        return {"res": res}
    except Exception as e:
        connexion.rollback()
        print("SERVER: error " + str(e))
        cursor.close()
        return {"erreur": str(e)}


def main():
    connection = DBConnection.getConnection()
    cursor = connection.cursor()
    res = cursor.execute("SELECT to_regclass('public.users');")
    res = cursor.fetchone()
    cursor.close()
    if (res[0] == None):
        create_db(psycopg2.connect(os.environ["DATABASE_URL"]))

main()