import os
import ssl
import pymysql
import mysql.connector
from dotenv import load_dotenv

load_dotenv()


class CloudConnection:
    def __init__(self, connection):
        self.connection = connection

    def cursor(self, dictionary=False, **kwargs):
        if dictionary:
            return self.connection.cursor(pymysql.cursors.DictCursor)
        return self.connection.cursor()

    def commit(self):
        return self.connection.commit()

    def rollback(self):
        return self.connection.rollback()

    def close(self):
        return self.connection.close()


def get_db_connection():
    if os.getenv("DB_PROVIDER", "local").lower() == "cloud":

        ssl_context = ssl.create_default_context()

        connection = pymysql.connect(
            host=os.environ["DB_HOST"],
            port=int(os.getenv("DB_PORT", "3306")),
            user=os.environ["DB_USER"],
            password=os.environ["DB_PASSWORD"],
            database=os.environ["DB_NAME"],
            ssl=ssl_context,
            charset="utf8mb4",
            autocommit=False
        )

        return CloudConnection(connection)

    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )