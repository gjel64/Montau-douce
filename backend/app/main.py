import os
import psycopg2
from fastapi import FastAPI
from app.DBConnection import DBConnection

app = FastAPI()

@app.get("/ping")
def ping_db():
    connexion = DBConnection.getConnection()
    cursor = connexion.cursor()
    cursor.execute("SELECT version();")
    version = cursor.fetchone()
    connexion.close()
    return {"postgres_version": version}