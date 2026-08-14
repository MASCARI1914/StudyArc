from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Σύνδεση στη βάση δεδομένων σου
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/studyarc"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def populate():
    db = SessionLocal()
    try:
        # Καθαρισμός παλιών εγγραφών με ρητή δήλωση text() για το SQLAlchemy 2.0+
        db.execute(text("TRUNCATE TABLE courses CASCADE;"))
        db.commit()
        
        # Εισαγωγή των 10 επίσημων μαθημάτων βάσει Uniportal
        sql_query = text("""
        INSERT INTO courses (course_code, title, ects, semester, difficulty_multiplier) VALUES
        ('1625-1101', 'Μαθηματικά Ι', 6, 1, 0.30),
        ('1625-1102', 'Δομημένος Προγραμματισμός', 6, 1, 0.48),
        ('1625-1103', 'Εισαγωγή στην Επιστήμη των Υπολογιστών', 6, 1, 0.10),
        ('1625-1104', 'Ηλεκτρονική Φυσική', 6, 1, 0.82),
        ('1625-1105', 'Κυκλώματα Συνεχούς Ρεύματος', 6, 1, 0.20),
        ('1625-1201', 'Μαθηματικά ΙΙ', 6, 2, 0.60),
        ('1625-1202', 'Μετρήσεις και Κυκλώματα Εναλλασσόμενου Ρεύματος', 6, 2, 0.50),
        ('1625-1203', 'Τεχνική Συγγραφή, Παρουσίαση και Ορολογία Ξένης Γλώσσας', 6, 2, 0.72),
        ('1625-1204', 'Σχεδίαση Ψηφιακών Συστημάτων', 6, 2, 0.50),
        ('1625-1205', 'Αντικειμενοστρεφής Προγραμματισμός', 6, 2, 0.62);
        """)
        
        db.execute(sql_query)
        db.commit()
        print("✅ Τα μαθήματα εισήχθησαν με επιτυχία στη βάση δεδομένων studyarc!")
    except Exception as e:
        db.rollback()
        print(f"❌ Σφάλμα κατά την εισαγωγή: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    populate()