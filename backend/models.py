"""
SQLAlchemy models for Ambient AI Healthcare.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    patient_uid = Column(String(10), unique=True, index=True)  # 5-char unique ID like Aadhar
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(String(50), nullable=False)  # doctor, patient, admin
    phone = Column(String(50))
    address = Column(Text)
    preferred_language = Column(String(10), default="en")
    signature_filename = Column(String(255))  # e-signature image
    created_at = Column(DateTime, default=datetime.utcnow)


class Consultation(Base):
    __tablename__ = "consultations"
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(50), default="active")
    overall_understanding_score = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)


class Transcript(Base):
    __tablename__ = "transcripts"
    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(Integer, ForeignKey("consultations.id"), nullable=False)
    content = Column(Text)
    audio_path = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)


class ClinicalReport(Base):
    __tablename__ = "clinical_reports"
    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(Integer, ForeignKey("consultations.id"), nullable=False)
    symptoms = Column(Text)
    diagnosis = Column(Text)
    medications = Column(Text)
    follow_up = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class TeachBackItem(Base):
    __tablename__ = "teach_back_items"
    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(Integer, ForeignKey("consultations.id"), nullable=False)
    question = Column(Text)
    patient_answer = Column(Text)
    understanding_score = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)


class PatientReport(Base):
    __tablename__ = "patient_reports"
    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(Integer, ForeignKey("consultations.id"), nullable=False)
    language = Column(String(10), default="en")
    content = Column(Text)
    diagnosis_summary = Column(Text)
    medication_instructions = Column(Text)
    warning_signs = Column(Text)
    follow_up_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class MedicalImage(Base):
    """Store medical images like X-rays, injury photos, etc."""
    __tablename__ = "medical_images"
    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(Integer, ForeignKey("consultations.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255))
    image_type = Column(String(100))  # x-ray, burn, injury, scan, etc.
    description = Column(Text)
    file_path = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
