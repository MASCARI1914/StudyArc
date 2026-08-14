import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Στοιχεία σύνδεσης στην PostgreSQL
DB_HOST = "127.0.0.1"
DB_PORT = "5432"
DB_USER = "postgres"
DB_PASSWORD = "1234"  # <-- Βάλε τον δικό σου κωδικό PostgreSQL εδώ αν διαφέρει
DB_NAME = "studyarc"

def setup_database():
    print("[*] Ξεκινάει η αρχικοποίηση της PostgreSQL για το StudyArc...")
    
    # 1. Σύνδεση στη default βάση για δημιουργία της βάσης studyarc
    try:
        conn = psycopg2.connect(dbname="postgres", user=DB_USER, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{DB_NAME}';")
        if not cursor.fetchone():
            cursor.execute(f"CREATE DATABASE {DB_NAME};")
            print(f"[+] Η βάση δεδομένων '{DB_NAME}' δημιουργήθηκε!")
        else:
            print(f"[~] Η βάση δεδομένων '{DB_NAME}' υπάρχει ήδη.")
            
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"[-] Σφάλμα κατά τη δημιουργία της βάσης: {e}")
        return

    # 2. Σύνδεση στη βάση studyarc για τη δημιουργία των πινάκων
    try:
        conn = psycopg2.connect(dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT)
        cursor = conn.cursor()
        
        # Α) Πίνακας Ρόλων
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                role_name VARCHAR(20) UNIQUE NOT NULL
            );
        """)
        
        # Εισαγωγή βασικών ρόλων αν δεν υπάρχουν
        cursor.execute("SELECT COUNT(*) FROM roles;")
        if cursor.fetchone()[0] == 0:
            cursor.executemany("INSERT INTO roles (role_name) VALUES (%s);", [('Admin',), ('Student',)])
            print("[+] Δημιουργήθηκαν οι ρόλοι: Admin, Student.")

        # Β) Πίνακας Χρηστών
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role_id INT REFERENCES roles(id) DEFAULT 2,
                total_xp INT DEFAULT 0,
                level INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Γ) Πίνακας Μαθημάτων (Με τους κωδικούς από το Uniportal)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS courses (
                id SERIAL PRIMARY KEY,
                course_code VARCHAR(20) UNIQUE, 
                title VARCHAR(100) NOT NULL,
                semester INT NOT NULL,
                ects INT NOT NULL,
                difficulty_multiplier FLOAT DEFAULT 1.0
            );
        """)
        
        # Δ) Πίνακας Βαθμών (Με πρόβλεψη για Verification από το Uniportal)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_grades (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                course_id INT REFERENCES courses(id) ON DELETE CASCADE,
                grade FLOAT DEFAULT 0.0,
                earned_xp INT DEFAULT 0,
                is_verified BOOLEAN DEFAULT FALSE, 
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, course_id)
            );
        """)

        # Ε) Πίνακας Sessions Διαβάσματος (Gamification)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS study_sessions (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                course_id INT REFERENCES courses(id) ON DELETE CASCADE,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP,
                duration_minutes INT,
                xp_gained INT DEFAULT 0
            );
        """)

        # ΣΤ) Πίνακας Todo Tasks
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS todo_tasks (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                course_id INT REFERENCES courses(id) ON DELETE CASCADE,
                task_title VARCHAR(150) NOT NULL,
                is_completed BOOLEAN DEFAULT FALSE,
                due_date TIMESTAMP
            );
        """)

        # Ζ) Πίνακας Logs Συγχρονισμού Uniportal
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS external_sync_logs (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                sync_status VARCHAR(20), 
                error_message TEXT,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        print("[+] Όλοι οι πίνακες και οι ξένες κλείδες δημιουργήθηκαν επιτυχώς!")

        # 3. Εισαγωγή των ΠΡΑΓΜΑΤΙΚΩΝ μαθημάτων της σχολής από το Uniportal
        cursor.execute("SELECT COUNT(*) FROM courses;")
        if cursor.fetchone()[0] == 0:
            default_courses = [
                # --- Α' ΕΞΑΜΗΝΟ ---
                ("1625-1102", "Δομημένος Προγραμματισμός", 1, 6, 1.5),
                ("1625-1103", "Εισαγωγή στην Επιστήμη των Υπολογιστών", 1, 5, 1.1),
                ("1625-1104", "Ηλεκτρονική Φυσική", 1, 5, 1.3),
                ("1625-1105", "Κυκλώματα Συνεχούς Ρεύματος", 1, 5, 1.4),
                ("1625-1101", "Μαθηματικά Ι", 1, 6, 1.4),
                
                # --- Β' ΕΞΑΜΗΝΟ ---
                ("1625-1205", "Αντικειμενοστραφής Προγραμματισμός", 2, 6, 1.5),
                ("1625-1201", "Μαθηματικά ΙΙ", 2, 6, 1.5),
                ("1625-1202", "Μετρήσεις και Κυκλώματα Εναλλασσόμενου Ρεύματος", 2, 5, 1.4),
                ("1625-1204", "Σχεδίαση Ψηφιακών Συστημάτων", 2, 5, 1.3),
                ("1625-1203", "Τεχνική Συγγραφή, Παρουσίαση και Ορολογία Ξένης Γλώσσας", 2, 4, 1.0)
            ]
            cursor.executemany("""
                INSERT INTO courses (course_code, title, semester, ects, difficulty_multiplier)
                VALUES (%s, %s, %s, %s, %s);
            """, default_courses)
            print("[+] Εισήχθησαν τα πραγματικά μαθήματα του ΔΙΠΑΕ με τους κωδικούς τους!")

        conn.commit()
        cursor.close()
        conn.close()
        print("[+] Η βάση δεδομένων αρχικοποιήθηκε πλήρως και είναι έτοιμη!")
        
    except Exception as e:
        print(f"[-] Σφάλμα κατά τη δημιουργία των πινάκων: {e}")

if __name__ == "__main__":
    setup_database()