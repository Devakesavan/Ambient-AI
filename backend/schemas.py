"""
Pydantic schemas for Ambient AI Healthcare API.
"""
from datetime import datetime
from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str | None
    role: str
    phone: str | None
    address: str | None
    preferred_language: str | None
    signature_filename: str | None = None

    class Config:
        from_attributes = True


class PatientCreate(BaseModel):
    email: str
    password: str
    full_name: str
    phone: str | None = None
    address: str | None = None
    preferred_language: str = "en"


class ConsultationCreate(BaseModel):
    patient_id: int


class TranscriptResponse(BaseModel):
    id: int
    consultation_id: int
    content: str | None
    audio_path: str | None
    created_at: datetime


class ClinicalReportResponse(BaseModel):
    id: int
    consultation_id: int
    symptoms: str | None
    diagnosis: str | None
    medications: str | None
    follow_up: str | None
    created_at: datetime


class TeachBackItemResponse(BaseModel):
    id: int
    consultation_id: int
    question: str | None
    patient_answer: str | None
    understanding_score: int | None
    created_at: datetime


class PatientReportResponse(BaseModel):
    id: int
    consultation_id: int
    language: str
    content: str | None
    diagnosis_summary: str | None
    medication_instructions: str | None
    warning_signs: str | None
    follow_up_date: datetime | None
    created_at: datetime


class MedicalImageResponse(BaseModel):
    id: int
    consultation_id: int
    filename: str
    original_filename: str | None
    image_type: str | None
    description: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class ConsultationResponse(BaseModel):
    id: int
    doctor_id: int
    patient_id: int
    status: str
    overall_understanding_score: int | None = None
    created_at: datetime
    completed_at: datetime | None
    doctor_name: str | None = None
    doctor_signature_filename: str | None = None
    patient_name: str | None = None
    transcript: TranscriptResponse | None = None
    clinical_report: ClinicalReportResponse | None = None
    teach_back_items: list[TeachBackItemResponse] = []
    patient_report: PatientReportResponse | None = None
    medical_images: list[MedicalImageResponse] = []

    class Config:
        from_attributes = True


TokenResponse.model_rebuild()
