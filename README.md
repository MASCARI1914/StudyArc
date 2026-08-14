# 🎓 StudyArc - Academic Gamification & Rewards Platform

Το **StudyArc** είναι μια full-stack διαδικτυακή πλατφόρμα παιχνιδοποίησης (gamification) της ακαδημαϊκής πορείας, σχεδιασμένη να μετατρέπει την προσπάθεια και την επιτυχία των φοιτητών σε ανταλλάξιμα ψηφιακά κίνητρα (**Arcade Tokens**).

---

## 🛠️ Τεχνολογικό Stack
* **Frontend:** React, Tailwind CSS, Axios, Lucide Icons, Vite
* **Backend:** FastAPI (Python), SQLAlchemy, Passlib (Bcrypt)
* **Database:** PostgreSQL

---

## 🚀 Βασικά Χαρακτηριστικά
* **Δυναμικός Υπολογισμός Tokens:** Μαθηματικός αλγόριθμος βασισμένος σε Βαθμό, ECTS, Συντελεστή Δυσκολίας ($\sigma$) και First Attempt Bonus ($1.2\times$).
* **Πλήρης Κάλυψη Προγράμματος Σπουδών:** 45 μαθήματα κατηγοριοποιημένα στα Εξάμηνα Α' έως Θ'.
* **Arcade Store (4 Tiers):** Εξαργύρωση Tokens σε πραγματικές παροχές (Daily Boost, Student Meal, Tech & Lifestyle, Graduation Grand Prize).
* **Πίνακας Κατάταξης (Leaderboard):** Real-time σύστημα αξιολόγησης και κατάταξης φοιτητών βάσει XP.
* **Admin Panel:** Πλήρης διαχείριση φοιτητών, έλεγχος βαθμολογιών και έγκριση κουπονιών ανταμοιβής.

---

## ⚙️ Τοπική Εκτέλεση (Local Setup)

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install fastapi uvicorn sqlalchemy psycopg2 passlib bcrypt pydantic
uvicorn main:app --reload

[StudyArc_Technical_Documentation.docx](https://github.com/user-attachments/files/31077963/StudyArc_Technical_Documentation.docx)
