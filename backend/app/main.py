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
    return {"result": version}

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
        return {"result": res}
    except Exception as e:
        connexion.rollback()
        print("SERVER: error " + str(e))
        cursor.close()
        return {"error": str(e)}

@app.post("/fill_user")
def fill_user(id, name, tel, passwd):
    connexion = DBConnection.getConnection()
    cursor = connexion.cursor()
    try:
        cursor.execute(
            f"""UPDATE users
                SET user_name = '{name}', user_tel = '{tel}', user_passwd = '{passwd}'
                WHERE user_id = {id}
                RETURNING user_id;""",
        )
        res = cursor.fetchone()
        connexion.commit()
        cursor.close()
        return {"result": res}
    except Exception as e:
        connexion.rollback()
        print("SERVER: error " + str(e))
        cursor.close()
        return {"error": str(e)}

@app.get("/user_id_from_jwt")
def user_id_from_jwt(jwt):
    connexion = DBConnection.getConnection()
    cursor = connexion.cursor()
    try:
        cursor.execute(
            f"SELECT user_id FROM users WHERE user_jwt = '{jwt}'",
        )
        res = cursor.fetchone()[0]
        connexion.commit()
        cursor.close()
        return {"result": res}
    except Exception as e:
        connexion.rollback()
        print("SERVER: error " + str(e))
        cursor.close()
        return {"error": str(e)}

@app.get("/user_info_from_id")
def user_info_from_id(id):
    connexion = DBConnection.getConnection()
    cursor = connexion.cursor()
    try:
        cursor.execute(
            f"SELECT * FROM users WHERE user_id = '{id}'",
        )
        res = cursor.fetchone()
        connexion.commit()
        cursor.close()
        return {"result": res}
    except Exception as e:
        connexion.rollback()
        print("SERVER: error " + str(e))
        cursor.close()
        return {"error": str(e)}



def main():
    connection = DBConnection.getConnection()
    cursor = connection.cursor()
    res = cursor.execute("SELECT to_regclass('public.users');")
    res = cursor.fetchone()
    cursor.close()
    if (res[0] == None):
        create_db(psycopg2.connect(os.environ["DATABASE_URL"]))

main()