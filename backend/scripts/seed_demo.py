"""
Seed demo users for Ambient AI Healthcare.
Run: python scripts/seed_demo.py (from backend directory)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine, Base
from models import User
from auth import hash_password

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == "doctor@ambient.ai").first():
            print("Demo users already exist.")
            return
        users = [
            User(email="doctor@ambient.ai", hashed_password=hash_password("doctor123"), full_name="Dr. Smith", role="doctor"),
            User(email="patient1@ambient.ai", hashed_password=hash_password("patient123"), full_name="Kamalesh R", role="patient", preferred_language="en"),
            User(email="admin@ambient.ai", hashed_password=hash_password("admin123"), full_name="Admin User", role="admin"),
        ]
        for u in users:
            db.add(u)
        db.commit()
        print("Demo users created: doctor@ambient.ai/doctor123, patient1@ambient.ai/patient123, admin@ambient.ai/admin123")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
