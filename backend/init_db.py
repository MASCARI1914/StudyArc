import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from database import DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER

def initialize_app_database():
    # 1. Δημιουργία της βάσης αν δεν υπάρχει
    try:
        conn = psycopg2.connect(dbname="postgres", user=DB_USER, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{DB_NAME}';")
        if not cursor.fetchone():
            cursor.execute(f"CREATE DATABASE {DB_NAME};")
            print(f"[+] Η βάση '{DB_NAME}' δημιουργήθηκε!")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"[-] Σφάλμα στη δημιουργία βάσης: {e}")
        return

    # 2. Δημιουργία Πινάκων
    conn = psycopg2.connect(dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            total_xp INT DEFAULT 0,
            level INT DEFAULT 1
        );
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS courses (
            id SERIAL PRIMARY KEY,
            title VARCHAR(100) NOT NULL,
            semester INT NOT NULL,
            ects INT NOT NULL,
            difficulty_multiplier FLOAT NOT NULL
        );
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_grades (
            id SERIAL PRIMARY KEY,
            user_id INT REFERENCES users(id) ON DELETE CASCADE,
            course_id INT REFERENCES courses(id) ON DELETE CASCADE,
            grade FLOAT DEFAULT 0.0,
            earned_xp INT DEFAULT 0,
            UNIQUE(user_id, course_id)
        );
    """)

    # Εισαγωγή 10 βασικών μαθημάτων
    cursor.execute("SELECT COUNT(*) FROM courses;")
    if cursor.fetchone()[0] == 0:
        default_courses = [
            ("Γραμμική Άλγεβρα", 1, 5, 1.2),
            ("Εισαγωγή στον Προγραμματισμό", 1, 6, 1.5),
            ("Μαθηματική Ανάλυση Ι", 1, 5, 1.3),
            ("Ψηφιακά Συστήματα", 1, 5, 1.1),
            ("Διακριτά Μαθηματικά", 1, 4, 1.2),
            ("Αντικειμενοστραφής Προγραμματισμός", 2, 6, 1.4),
            ("Δομές Δεδομένων", 2, 6, 1.6),
            ("Αρχιτεκτονική Υπολογιστών", 2, 5, 1.3),
            ("Πιθανότητες & Στατιστική", 2, 5, 1.2),
            ("Μαθηματική Ανάλυση ΙΙ", 2, 4, 1.4)
        ]
        cursor.executemany("""
            INSERT INTO courses (title, semester, ects, difficulty_multiplier)
            VALUES (%s, %s, %s, %s);
        """, default_courses)
        print("[+] Τα βασικά μαθήματα προστέθηκαν!")

    conn.commit()
    cursor.close()
    conn.close()
    print("[+] Η βάση αρχικοποιήθηκε επιτυχώς!")

if __name__ == "__main__":
    initialize_app_database()