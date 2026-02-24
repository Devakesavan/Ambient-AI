"""
Create initial admin (and optional doctor) when env vars are set and no users exist.
Run once on first deploy (e.g. from Docker CMD before uvicorn).
"""
import os
import sys

# Ensure app modules are importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, get_db, Base
from models import User
from auth import hash_password


def main():
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip()
    admin_password = os.environ.get("ADMIN_PASSWORD", "").strip()
    admin_name = os.environ.get("ADMIN_NAME", "Admin").strip()
    doctor_email = os.environ.get("DOCTOR_EMAIL", "").strip()
    doctor_password = os.environ.get("DOCTOR_PASSWORD", "").strip()
    doctor_name = os.environ.get("DOCTOR_NAME", "Doctor").strip()

    if not admin_email or not admin_password:
        return

    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        if db.query(User).first() is not None:
            return  # Already has users
        admin = User(
            email=admin_email,
            hashed_password=hash_password(admin_password),
            full_name=admin_name or "Admin",
            role="admin",
            patient_uid=None,
        )
        db.add(admin)
        db.commit()
        print(f"[Seed] Created admin user: {admin_email}")
        if doctor_email and doctor_password:
            doctor = User(
                email=doctor_email,
                hashed_password=hash_password(doctor_password),
                full_name=doctor_name or "Doctor",
                role="doctor",
                patient_uid=None,
            )
            db.add(doctor)
            db.commit()
            print(f"[Seed] Created doctor user: {doctor_email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
