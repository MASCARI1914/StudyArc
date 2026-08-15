import math
import secrets
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/studyarc"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ---- ΜΟΝΤΕΛΑ SQLALCHEMY ----

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String, unique=True, nullable=False)
    users = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="RESTRICT"), default=2)
    total_xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    tokens = Column(Integer, default=0) 
    
    role = relationship("Role", back_populates="users")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")

class UserSession(Base):
    __tablename__ = "user_sessions"
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    user = relationship("User", back_populates="sessions")

class Course(Base):
    __tablename__ = "courses"
    course_code = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    ects = Column(Integer, default=6)
    semester = Column(Integer, nullable=False)
    difficulty_multiplier = Column(Float, nullable=False)

class UserGrade(Base):
    __tablename__ = "user_grades"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    course_id = Column(String, ForeignKey("courses.course_code", ondelete="CASCADE"))
    grade = Column(Float, nullable=False)
    is_first_attempt = Column(Boolean, default=True)

class StoreItem(Base):
    __tablename__ = "store_items"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    tokens_required = Column(Integer, nullable=False)
    description = Column(String, nullable=True)
    min_level = Column(Integer, default=1)

class UserReward(Base):
    __tablename__ = "user_rewards"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    item_id = Column(Integer, ForeignKey("store_items.id", ondelete="CASCADE"))
    status = Column(String, default="Pending") 

Base.metadata.create_all(bind=engine)

# ---- ΑΥΤΟΜΑΤΟ SEEDING ΜΕ ΟΛΑ ΤΑ 45 ΜΑΘΗΜΑΤΑ (ΕΞΑΜΗΝΑ Α' - Θ') ----
def seed_database():
    db = SessionLocal()
    try:
        if db.query(Role).count() == 0:
            db.add_all([Role(id=1, role_name="Admin"), Role(id=2, role_name="Student")])
            db.commit()
            
        if db.query(StoreItem).count() == 0:
            default_rewards = [
                # Tier 1
                StoreItem(id=1, title="☕ Δωρεάν Καφές / Ρόφημα (Κυλικείο Σχολής)", tokens_required=5, description="Ξεκλειδώστε ένα δωρεάν ρόφημα ή καφέ από το κυλικείο του πανεπιστημίου."),
                StoreItem(id=2, title="🥤 Free Coffee Voucher (Mikel Σίνδου)", tokens_required=8, description="Απολαύστε τον αγαπημένο σας καφέ στο κατάστημα Mikel Σίνδου."),
                StoreItem(id=3, title="🥪 Snack & Beverage Combo (Viral Coffeatery Σίνδου)", tokens_required=12, description="Κουπόνι για τοστ / σνακ και αναψυκτικό στο Viral Coffeatery."),
                
                # Tier 2
                StoreItem(id=4, title="🍔 Student Combo Meal 5€ (Εστίαση Σίνδος)", tokens_required=30, description="Έκπτωση 5€ σε επιλεγμένα καταστήματα street food της Σίνδου."),
                StoreItem(id=5, title="🍕 Κουπόνι Γεύματος 10€ (Goody's / Pizza Fan)", tokens_required=55, description="Κουπόνι αξίας 10€ για παραγγελίες φαγητού σε αλυσίδες εστίασης."),
                
                # Tier 3
                StoreItem(id=6, title="🎧 Tech Accessories Voucher 20€ (Πλαίσιο)", tokens_required=150, description="Δωροεπιταγή 20€ για αγορά PC accessories από το Πλαίσιο."),
                StoreItem(id=7, title="🛍️ Δωροεπιταγή Ένδυσης 50€ (Zara / H&M)", tokens_required=350, description="Μεγάλη δωροεπιταγή 50€ για καταστήματα ένδυσης."),
                
                # Tier 4
                StoreItem(id=8, title="💻 Grand Tech Prize: Laptop / Tablet 300€ (Πλαίσιο)", tokens_required=1200, description="Το απόλυτο έπαθλο αποφοίτησης! Δωροεπιταγή 300€ για Laptop/Tablet από το Πλαίσιο.")
            ]
            db.add_all(default_rewards)
            db.commit()
    except Exception as e: 
        print(f"[-] Seeding error: {e}")
    finally: 
        db.close()

seed_database()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

class UserRegister(BaseModel): username: str; password: str
class UserLogin(BaseModel): username: str; password: str
class GradeSubmit(BaseModel): user_id: int; course_code: str; grade: float; is_first_attempt: bool
class RewardAction(BaseModel): reward_id: int; action: str 
class StatsUpdate(BaseModel): user_id: int; total_xp: int; level: int; tokens: int
class ClaimReward(BaseModel): user_id: int; item_id: int
class VerifyTokenRequest(BaseModel): token: str

# 📈 ΠΛΗΡΕΣ ΛΕΞΙΚΟ ΔΥΣΚΟΛΙΑΣ 45 ΜΑΘΗΜΑΤΩΝ[cite: 8]
COURSE_DIFFICULTY = {
    # Α' Εξάμηνο[cite: 8]
    "1625-1101": 0.30, "1625-1102": 0.48, "1625-1103": 0.10, "1625-1104": 0.82, "1625-1105": 0.20,
    # Β' Εξάμηνο[cite: 8]
    "1625-1201": 0.60, "1625-1202": 0.56, "1625-1203": 0.72, "1625-1204": 0.58, "1625-1205": 0.62,
    # Γ' Εξάμηνο[cite: 8]
    "1625-1301": 0.35, "1625-1302": 0.58, "1625-1303": 0.45, "1625-1304": 0.23, "1625-1305": 0.40,
    # Δ' Εξάμηνο[cite: 8]
    "1625-1401": 0.64, "1625-1402": 0.68, "1625-1403": 0.32, "1625-1404": 0.55, "1625-1405": 0.88,
    # Ε' Εξάμηνο[cite: 8]
    "1625-1501": 1.00, "1625-1502": 0.37, "1625-1503": 0.56, "1625-1504": 0.35, "1625-1505": 0.32,
    # ΣΤ' Εξάμηνο[cite: 8]
    "1625-1601": 0.53, "1625-1602": 0.30, "1625-1603": 0.41, "1625-1604": 0.57, "1625-1605": 0.48,
    # Ζ' Εξάμηνο[cite: 8]
    "1625-1701": 0.84, "1625-1702": 0.42, "1625-1703": 0.89, "1625-1704": 0.41,
    # Η' Εξάμηνο[cite: 8]
    "1625-1801": 0.53, "1625-1802": 0.29, "1625-1803": 0.56, "1625-1804": 0.79, "1625-1805": 0.52,
    # Θ' Εξάμηνο[cite: 8]
    "1625-1901": 0.60, "1625-1902": 0.58, "1625-1903": 0.58, "1625-1904": 0.40, "1625-1905": 0.67, "1625-1906": 0.84
}

def calculate_tokens_earned(grade: float, course_code: str, is_first_attempt: bool) -> int:
    if grade < 5.0: return 0
    sigma = COURSE_DIFFICULTY.get(course_code, 0.50)
    return math.floor(grade * 6 * sigma * (1.2 if is_first_attempt else 1.0))

# ---- ENDPOINTS ----

@app.post("/register")
def register(user: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Το Username υπάρχει ήδη.")
    hashed_pw = pwd_context.hash(user.password)
    assigned_role = 1 if user.username == "christos" else 2
    db.add(User(username=user.username, password_hash=hashed_pw, role_id=assigned_role))
    db.commit()
    return {"status": "success"}

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not pwd_context.verify(user.password, db_user.password_hash):
        raise HTTPException(status_code=400, detail="Λάθος στοιχεία σύνδεσης.")
    
    session_token = secrets.token_hex(32)
    db.add(UserSession(token=session_token, user_id=db_user.id))
    db.commit()
    
    return {
        "status": "success",
        "token": session_token,
        "user_id": db_user.id,
        "username": db_user.username,
        "role_id": db_user.role_id
    }

@app.post("/api/auth/verify")
def verify_token(data: VerifyTokenRequest, db: Session = Depends(get_db)):
    session = db.query(UserSession).filter(UserSession.token == data.token).first()
    if not session:
        raise HTTPException(status_code=401, detail="Invalid Session Token")
    
    user = db.query(User).filter(User.id == session.user_id).first()
    return {
        "status": "success",
        "user_id": user.id,
        "username": user.username,
        "role_id": user.role_id
    }

@app.post("/api/auth/logout")
def logout(data: VerifyTokenRequest, db: Session = Depends(get_db)):
    session = db.query(UserSession).filter(UserSession.token == data.token).first()
    if session:
        db.delete(session)
        db.commit()
    return {"status": "success"}

@app.get("/dashboard/{user_id}")
def get_dashboard(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    grades = db.query(UserGrade).filter(UserGrade.user_id == user_id).all()
    passed = [g for g in grades if g.grade >= 5]
    gpa = round(sum([g.grade for g in passed]) / len(passed), 2) if passed else 0.0
    all_courses = db.query(Course).all()
    courses_list = []
    user_grades_dict = {g.course_id: g for g in grades}
    for c in all_courses:
        ug = user_grades_dict.get(c.course_code)
        courses_list.append({
            "id": c.course_code, 
            "title": c.title, 
            "course_code": c.course_code, 
            "ects": c.ects, 
            "difficulty_multiplier": c.difficulty_multiplier, 
            "grade": ug.grade if ug else 0.0, 
            "semester": int(c.semester), 
            "is_first_attempt": ug.is_first_attempt if ug else True
        })
    claims = db.query(UserReward).filter(UserReward.user_id == user_id).all()
    return {
        "user": {"username": user.username, "level": user.level, "total_xp": user.total_xp, "tokens": user.tokens}, 
        "gpa": str(gpa), 
        "courses": courses_list, 
        "claims": {c.item_id: c.status for c in claims}
    }

@app.post("/submit-grade")
def submit_grade(data: GradeSubmit, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    existing_grade = db.query(UserGrade).filter(UserGrade.user_id == data.user_id, UserGrade.course_id == data.course_code).first()
    
    if data.grade >= 5.0:
        if existing_grade:
            existing_grade.grade = data.grade
            existing_grade.is_first_attempt = data.is_first_attempt
        else:
            db.add(UserGrade(user_id=data.user_id, course_id=data.course_code, grade=data.grade, is_first_attempt=data.is_first_attempt))
    else:
        if existing_grade:
            db.delete(existing_grade)
            
    db.commit()

    all_user_grades = db.query(UserGrade).filter(UserGrade.user_id == data.user_id).all()
    
    total_tokens = 0
    for g in all_user_grades:
        total_tokens += calculate_tokens_earned(g.grade, g.course_id, g.is_first_attempt)
        
    spent_tokens = 0
    user_rewards = db.query(UserReward).filter(UserReward.user_id == data.user_id).all()
    
    for r in user_rewards:
        item = db.query(StoreItem).filter(StoreItem.id == r.item_id).first()
        if item:
            if total_tokens - spent_tokens < item.tokens_required and r.status == "Pending":
                db.delete(r)
            else:
                spent_tokens += item.tokens_required
                
    db.commit()

    user.tokens = max(0, total_tokens - spent_tokens)
    user.total_xp = total_tokens * 100
    user.level = max(1, math.floor(user.total_xp / 1000) + 1)
    
    db.commit()
    return {"status": "success"}

@app.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.role_id == 2).order_by(User.total_xp.desc()).all()
    return [{"rank": r, "username": u.username, "level": u.level, "total_xp": u.total_xp} for r, u in enumerate(users, start=1)]

@app.get("/store/items")
def get_store_items(db: Session = Depends(get_db)):
    items = db.query(StoreItem).order_by(StoreItem.min_level.asc(), StoreItem.tokens_required.asc()).all()
    return items

@app.post("/store/claim")
def claim_reward(data: ClaimReward, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == data.user_id).first()
    item = db.query(StoreItem).filter(StoreItem.id == data.item_id).first()
    if user.tokens < item.tokens_required: 
        raise HTTPException(status_code=400, detail="No tokens")
    user.tokens -= item.tokens_required
    db.add(UserReward(user_id=user.id, item_id=item.id, status="Pending"))
    db.commit()
    return {"status": "success"}

@app.get("/admin/students")
def admin_get_students(db: Session = Depends(get_db)):
    students = db.query(User).filter(User.role_id == 2).all()
    output = []
    for s in students:
        grades = db.query(UserGrade).filter(UserGrade.user_id == s.id).all()
        output.append({
            "id": s.id, 
            "username": s.username, 
            "level": s.level, 
            "total_xp": s.total_xp, 
            "tokens": s.tokens, 
            "grades": {g.course_id: {"grade": g.grade, "is_first_attempt": g.is_first_attempt} for g in grades}
        })
    return output

@app.post("/admin/update-stats")
def admin_update_stats(data: StatsUpdate, db: Session = Depends(get_db)):
    student = db.query(User).filter(User.id == data.user_id, User.role_id == 2).first()
    if not student: raise HTTPException(status_code=404, detail="Not found")
    student.total_xp = data.total_xp
    student.level = data.level
    student.tokens = data.tokens
    db.commit()
    return {"status": "success"}

@app.get("/admin/rewards")
def admin_get_rewards(db: Session = Depends(get_db)):
    rewards = db.query(UserReward).all()
    output = []
    for r in rewards:
        u = db.query(User).filter(User.id == r.user_id).first()
        item = db.query(StoreItem).filter(StoreItem.id == r.item_id).first()
        if u and item: 
            output.append({
                "id": r.id, 
                "user_id": u.id, 
                "username": u.username, 
                "item_title": item.title, 
                "cost": item.tokens_required, 
                "status": r.status
            })
    return output

@app.post("/admin/rewards/action")
def admin_reward_action(data: RewardAction, db: Session = Depends(get_db)):
    reward = db.query(UserReward).filter(UserReward.id == data.reward_id).first()
    if not reward: 
        raise HTTPException(status_code=404, detail="Not found")
        
    if data.action == "approve": 
        reward.status = "Approved"
        
    elif data.action == "delete":
        user = db.query(User).filter(User.id == reward.user_id).first()
        item = db.query(StoreItem).filter(StoreItem.id == reward.item_id).first()
        
        if user and item and reward.status == "Pending": 
            user.tokens += item.tokens_required
            
        db.delete(reward)
        
    db.commit()
    return {"status": "success"}