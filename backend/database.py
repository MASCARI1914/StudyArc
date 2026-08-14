import psycopg2
from psycopg2.extras import RealDictCursor

DB_NAME = "studyarc"
DB_USER = "postgres"
DB_PASSWORD = "1234"  # 
DB_HOST = "127.0.0.1"
DB_PORT = "5432"

def get_db_connection():
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT,
            cursor_factory=RealDictCursor
        )
        return conn
    except Exception as e:
        print(f"[-] Αποτυχία σύνδεσης στην PostgreSQL: {e}")
        return None