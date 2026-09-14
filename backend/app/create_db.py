import psycopg2

def create_db(connection):
    try:
        cursor = connection.cursor()
        cursor.execute("""
        CREATE TABLE users (
            user_id SERIAL PRIMARY KEY,
            user_name VARCHAR(255) NOT NULL
        )
        """)

        cursor.close()
        connection.commit()
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
    connection.close()

    print("SERVER: DB created")

