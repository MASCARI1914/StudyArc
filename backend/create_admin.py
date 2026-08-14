import psycopg2
from passlib.context import CryptContext

# Ρυθμίσεις για την κρυπτογράφηση (Bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Στοιχεία του δικού σου Admin λογαριασμού
ADMIN_USERNAME = "christos"  # <-- ΒΑΛΕ ΤΟ USERNAME ΠΟΥ ΘΕΣ
ADMIN_PASSWORD = "2837issim"  # <-- ΒΑΛΕ ΤΟΝ ΚΩΔΙΚΟ ΠΟΥ ΘΕΣ

# Σύνδεση στη βάση (χωρίς κωδικό λόγω trust)
DB_HOST = "127.0.0.1"
DB_PORT = "5432"
DB_USER = "postgres"
DB_NAME = "studyarc"

def create_admin_user():
    try:
        conn = psycopg2.connect(dbname=DB_NAME, user=DB_USER, host=DB_HOST, port=DB_PORT)
        cursor = conn.cursor()
        
        # Έλεγχος αν υπάρχει ήδη ο χρήστης
        cursor.execute("SELECT id FROM users WHERE username = %s;", (ADMIN_USERNAME,))
        if cursor.fetchone():
            print(f"[~] Ο χρήστης '{ADMIN_USERNAME}' υπάρχει ήδη.")
            cursor.close()
            conn.close()
            return
            
        # Κρυπτογράφηση του κωδικού
        hashed_password = pwd_context.hash(ADMIN_PASSWORD)
        
        # Εισαγωγή του χρήστη με role_id = 1 (Admin)
        cursor.execute("""
            INSERT INTO users (username, password_hash, role_id)
            VALUES (%s, %s, 1);
        """, (ADMIN_USERNAME, hashed_password))
        
        conn.commit()
        print(f"[+] Ο Admin λογαριασμός '{ADMIN_USERNAME}' δημιουργήθηκε με επιτυχία!")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"[-] Σφάλμα κατά τη δημιουργία του Admin: {e}")

if __name__ == "__main__":
    create_admin_user()