import psycopg2

def create_db(connection):
    try:
        cursor = connection.cursor()
        cursor.execute("""
        CREATE TABLE users (
            user_id SERIAL PRIMARY KEY,
            user_jwt VARCHAR(255) NOT NULL,
            user_name VARCHAR(255),
            user_tel VARCHAR(15),
            user_passwd VARCHAR(255)
        )
        """)

        cursor.close()
        connection.commit()
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
    connection.close()

    print("SERVER: DB created")

