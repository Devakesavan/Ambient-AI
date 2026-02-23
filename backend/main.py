"""
Ambient AI Healthcare - FastAPI Backend
Doctor-led, multilingual ambient AI for patient understanding.
"""
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from config import settings
from database import engine, get_db, Base
from auth import get_current_user, hash_password, verify_password, create_token, RequireDoctor, RequirePatient, RequireAdmin
from models import User, Consultation, Transcript, ClinicalReport, TeachBackItem, PatientReport
from schemas import (
    LoginRequest, TokenResponse, UserResponse, PatientCreate, ConsultationCreate,
    ConsultationResponse, TranscriptResponse, ClinicalReportResponse, TeachBackItemResponse, PatientReportResponse,
)
from ai_service import transcribe_audio, extract_clinical_info, generate_teach_back_questions, compute_understanding_score, generate_patient_report, translate_text, translate_batch, extract_answer_for_question, extract_all_teach_back_answers
from storage import save_audio, save_transcript
from datetime import datetime


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Ambient AI Healthcare API", version="1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins.split(","), allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def user_to_response(u: User) -> UserResponse:
    return UserResponse(id=u.id, email=u.email, full_name=u.full_name, role=u.role, phone=u.phone, address=u.address, preferred_language=u.preferred_language)


@app.post("/auth/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=user_to_response(user))


@app.get("/auth/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user_to_response(user)


@app.get("/doctor/patients", response_model=List[UserResponse])
def list_patients(db: Session = Depends(get_db), _: User = Depends(RequireDoctor)):
    return [user_to_response(u) for u in db.query(User).filter(User.role == "patient").all()]


@app.post("/admin/patients", response_model=UserResponse)
def create_patient(data: PatientCreate, db: Session = Depends(get_db), _: User = Depends(RequireAdmin)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role="patient",
        phone=data.phone,
        address=data.address,
        preferred_language=data.preferred_language or "en",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user_to_response(user)


@app.get("/admin/patients", response_model=List[UserResponse])
def admin_list_patients(db: Session = Depends(get_db), _: User = Depends(RequireAdmin)):
    return [user_to_response(u) for u in db.query(User).filter(User.role == "patient").all()]


@app.post("/consultations")
def create_consultation(data: ConsultationCreate, db: Session = Depends(get_db), doctor: User = Depends(RequireDoctor)):
    patient = db.query(User).filter(User.id == data.patient_id, User.role == "patient").first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    c = Consultation(doctor_id=doctor.id, patient_id=data.patient_id)
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id}


def _consultation_response(c: Consultation, db: Session, language: str = "en") -> ConsultationResponse:
    tr = db.query(Transcript).filter(Transcript.consultation_id == c.id).first()
    cr = db.query(ClinicalReport).filter(ClinicalReport.consultation_id == c.id).first()
    tbi = db.query(TeachBackItem).filter(TeachBackItem.consultation_id == c.id).order_by(TeachBackItem.id).all()
    pr = db.query(PatientReport).filter(PatientReport.consultation_id == c.id).first()

    transcript_data = None
    if tr:
        content = translate_text(tr.content, language) if language != "en" else tr.content
        transcript_data = TranscriptResponse(id=tr.id, consultation_id=tr.consultation_id, content=content, audio_path=tr.audio_path, created_at=tr.created_at)

    clinical_data = None
    if cr:
        if language != "en":
            # Use batch translation for better performance
            translated = translate_batch({
                "symptoms": cr.symptoms or "",
                "diagnosis": cr.diagnosis or "",
                "medications": cr.medications or "",
                "follow_up": cr.follow_up or "",
            }, language)
            clinical_data = ClinicalReportResponse(
                id=cr.id, consultation_id=cr.consultation_id,
                symptoms=translated.get("symptoms", cr.symptoms or ""),
                diagnosis=translated.get("diagnosis", cr.diagnosis or ""),
                medications=translated.get("medications", cr.medications or ""),
                follow_up=translated.get("follow_up", cr.follow_up or ""),
                created_at=cr.created_at,
            )
        else:
            clinical_data = ClinicalReportResponse(
                id=cr.id, consultation_id=cr.consultation_id,
                symptoms=cr.symptoms, diagnosis=cr.diagnosis,
                medications=cr.medications, follow_up=cr.follow_up,
                created_at=cr.created_at,
            )

    patient_report_data = None
    if pr:
        if language != "en":
            # Use batch translation for better performance
            translated = translate_batch({
                "content": pr.content or "",
                "diagnosis_summary": pr.diagnosis_summary or "",
                "medication_instructions": pr.medication_instructions or "",
                "warning_signs": pr.warning_signs or "",
            }, language)
            patient_report_data = PatientReportResponse(
                id=pr.id, consultation_id=pr.consultation_id, language=language,
                content=translated.get("content", pr.content or ""),
                diagnosis_summary=translated.get("diagnosis_summary", pr.diagnosis_summary or ""),
                medication_instructions=translated.get("medication_instructions", pr.medication_instructions or ""),
                warning_signs=translated.get("warning_signs", pr.warning_signs or ""),
                follow_up_date=pr.follow_up_date, created_at=pr.created_at,
            )
        else:
            patient_report_data = PatientReportResponse(
                id=pr.id, consultation_id=pr.consultation_id, language=pr.language,
                content=pr.content, diagnosis_summary=pr.diagnosis_summary,
                medication_instructions=pr.medication_instructions,
                warning_signs=pr.warning_signs,
                follow_up_date=pr.follow_up_date, created_at=pr.created_at,
            )

    teach_back_responses = [
        TeachBackItemResponse(
            id=t.id, consultation_id=t.consultation_id, 
            question=translate_text(t.question or "", language) if language != "en" else (t.question or ""),
            patient_answer=translate_text(t.patient_answer or "", language) if language != "en" and t.patient_answer else (t.patient_answer or ""),
            understanding_score=t.understanding_score,
            created_at=t.created_at,
        )
        for t in tbi
    ]
    return ConsultationResponse(
        id=c.id, doctor_id=c.doctor_id, patient_id=c.patient_id, status=c.status,
        created_at=c.created_at, completed_at=c.completed_at,
        transcript=transcript_data, clinical_report=clinical_data,
        teach_back_items=teach_back_responses,
        patient_report=patient_report_data,
    )


@app.get("/consultations/{consultation_id}", response_model=ConsultationResponse)
def get_consultation(consultation_id: int, language: str = "en", db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    if user.role == "patient" and c.patient_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return _consultation_response(c, db, language=language)


@app.get("/consultations", response_model=List[ConsultationResponse])
def list_consultations(patient_id: int = None, language: str = "en", db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(Consultation)
    if user.role == "doctor":
        q = q.filter(Consultation.doctor_id == user.id)
    elif user.role == "patient":
        q = q.filter(Consultation.patient_id == user.id)
    if patient_id:
        q = q.filter(Consultation.patient_id == patient_id)
    consultations = q.order_by(Consultation.created_at.desc()).all()
    return [_consultation_response(c, db, language=language) for c in consultations]


@app.post("/consultations/{consultation_id}/mock-transcribe")
def mock_transcribe(consultation_id: int, db: Session = Depends(get_db), doctor: User = Depends(RequireDoctor)):
    c = db.query(Consultation).filter(Consultation.id == consultation_id, Consultation.doctor_id == doctor.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    from ai_service import MOCK_TRANSCRIPT
    tr = db.query(Transcript).filter(Transcript.consultation_id == c.id).first()
    if tr:
        tr.content = MOCK_TRANSCRIPT.strip()
    else:
        tr = Transcript(consultation_id=c.id, content=MOCK_TRANSCRIPT.strip())
        db.add(tr)
    db.commit()
    # Extract clinical information from transcript
    report = extract_clinical_info(tr.content)
    
    # Ensure we have a report (should always return a dict with the 4 keys)
    if not report or not isinstance(report, dict):
        report = {"symptoms": "", "diagnosis": "", "medications": "", "follow_up": ""}
    
    # Update or create clinical report
    cr = db.query(ClinicalReport).filter(ClinicalReport.consultation_id == c.id).first()
    if cr:
        cr.symptoms = report.get("symptoms", "") or ""
        cr.diagnosis = report.get("diagnosis", "") or ""
        cr.medications = report.get("medications", "") or ""
        cr.follow_up = report.get("follow_up", "") or ""
    else:
        cr = ClinicalReport(
            consultation_id=c.id,
            symptoms=report.get("symptoms", "") or "",
            diagnosis=report.get("diagnosis", "") or "",
            medications=report.get("medications", "") or "",
            follow_up=report.get("follow_up", "") or ""
        )
        db.add(cr)
    db.commit()
    patient = db.query(User).filter(User.id == c.patient_id).first()
    lang = patient.preferred_language if patient else "en"
    existing_tbi = db.query(TeachBackItem).filter(TeachBackItem.consultation_id == c.id).all()
    if len(existing_tbi) < 3:
        for t in existing_tbi:
            db.delete(t)
        for q in generate_teach_back_questions({"symptoms": cr.symptoms or "", "diagnosis": cr.diagnosis or "", "medications": cr.medications or "", "follow_up": cr.follow_up or ""}, lang):
            db.add(TeachBackItem(consultation_id=c.id, question=q))
    db.commit()
    return {"status": "ok"}


@app.post("/consultations/{consultation_id}/audio")
def upload_audio_endpoint(consultation_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), doctor: User = Depends(RequireDoctor)):
    c = db.query(Consultation).filter(Consultation.id == consultation_id, Consultation.doctor_id == doctor.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    audio_bytes = file.file.read()
    # Get file extension from uploaded filename for proper audio format handling
    filename = file.filename or "recording.webm"
    text = transcribe_audio(audio_bytes, consultation_id, filename)
    tr = db.query(Transcript).filter(Transcript.consultation_id == c.id).first()
    if tr:
        tr.content = text
    else:
        tr = Transcript(consultation_id=c.id, content=text)
        db.add(tr)
    db.commit()
    # Extract clinical information from transcript
    report = extract_clinical_info(text)
    
    # Ensure we have a report (should always return a dict with the 4 keys)
    if not report or not isinstance(report, dict):
        report = {"symptoms": "", "diagnosis": "", "medications": "", "follow_up": ""}
    
    # Update or create clinical report
    cr = db.query(ClinicalReport).filter(ClinicalReport.consultation_id == c.id).first()
    if cr:
        cr.symptoms = report.get("symptoms", "") or ""
        cr.diagnosis = report.get("diagnosis", "") or ""
        cr.medications = report.get("medications", "") or ""
        cr.follow_up = report.get("follow_up", "") or ""
    else:
        cr = ClinicalReport(
            consultation_id=c.id,
            symptoms=report.get("symptoms", "") or "",
            diagnosis=report.get("diagnosis", "") or "",
            medications=report.get("medications", "") or "",
            follow_up=report.get("follow_up", "") or ""
        )
        db.add(cr)
    db.commit()
    patient = db.query(User).filter(User.id == c.patient_id).first()
    lang = patient.preferred_language if patient else "en"
    existing_tbi = db.query(TeachBackItem).filter(TeachBackItem.consultation_id == c.id).all()
    if len(existing_tbi) < 3:
        for t in existing_tbi:
            db.delete(t)
        for q in generate_teach_back_questions({"symptoms": cr.symptoms or "", "diagnosis": cr.diagnosis or "", "medications": cr.medications or "", "follow_up": cr.follow_up or ""}, lang):
            db.add(TeachBackItem(consultation_id=c.id, question=q))
    db.commit()
    return {"status": "ok"}


@app.post("/consultations/{consultation_id}/teach-back/answer-all-audio")
def teach_back_answer_all_audio(consultation_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), doctor: User = Depends(RequireDoctor)):
    c = db.query(Consultation).filter(Consultation.id == consultation_id, Consultation.doctor_id == doctor.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    audio_bytes = file.file.read()
    if not audio_bytes or len(audio_bytes) < 500:
        raise HTTPException(
            status_code=400,
            detail="Recording too short or empty. Please record again (ask all questions, then stop)."
        )
    filename = file.filename or "teach-back-recording.webm"
    print(f"[Teach-Back] Processing audio file: {filename}, size: {len(audio_bytes)} bytes")
    
    full_text = transcribe_audio(audio_bytes, consultation_id, filename)
    print(f"[Teach-Back] Full transcript:\n{full_text}\n")
    
    if not full_text or not full_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Could not transcribe the recording. Please try again or upload an audio file."
        )
    cr = db.query(ClinicalReport).filter(ClinicalReport.consultation_id == c.id).first()
    if not cr:
        raise HTTPException(status_code=400, detail="Clinical report not found. Please transcribe the consultation first.")
    correct_info = f"Symptoms: {cr.symptoms or ''}\nDiagnosis: {cr.diagnosis or ''}\nMedications: {cr.medications or ''}\nFollow-up: {cr.follow_up or ''}"
    
    # Build clinical report dict for context
    clinical_report_dict = {
        "symptoms": cr.symptoms or "",
        "diagnosis": cr.diagnosis or "",
        "medications": cr.medications or "",
        "follow_up": cr.follow_up or ""
    }

    items = db.query(TeachBackItem).filter(TeachBackItem.consultation_id == c.id).order_by(TeachBackItem.id).all()
    questions = [tb.question or "" for tb in items]
    
    # Use batch extraction with clinical context for better accuracy
    answers = extract_all_teach_back_answers(questions, full_text, clinical_report_dict)
    print(f"[Teach-Back] Extracted answers: {answers}")
    
    for idx, tb in enumerate(items):
        answer = answers[idx] if idx < len(answers) else ""
        tb.patient_answer = answer or ""
        tb.understanding_score = compute_understanding_score(tb.question or "", answer or "", correct_info)
        print(f"[Teach-Back] Q{idx+1}: {tb.question[:50]}... -> A: {answer[:80] if answer else 'No answer'}... Score: {tb.understanding_score}")
    db.commit()
    return {"status": "ok"}


@app.post("/consultations/{consultation_id}/patient-report")
def generate_patient_report_endpoint(consultation_id: int, db: Session = Depends(get_db), doctor: User = Depends(RequireDoctor)):
    c = db.query(Consultation).filter(Consultation.id == consultation_id, Consultation.doctor_id == doctor.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    cr = db.query(ClinicalReport).filter(ClinicalReport.consultation_id == c.id).first()
    tr = db.query(Transcript).filter(Transcript.consultation_id == c.id).first()
    patient = db.query(User).filter(User.id == c.patient_id).first()
    lang = patient.preferred_language if patient else "en"
    report_data = generate_patient_report(
        {"symptoms": cr.symptoms or "", "diagnosis": cr.diagnosis or "", "medications": cr.medications or "", "follow_up": cr.follow_up or ""},
        tr.content or "",
        lang,
    )
    pr = PatientReport(consultation_id=c.id, language=report_data["language"], content=report_data["content"], diagnosis_summary=report_data["diagnosis_summary"], medication_instructions=report_data["medication_instructions"], warning_signs=report_data["warning_signs"])
    db.add(pr)
    db.commit()
    return {"status": "ok"}


@app.post("/consultations/{consultation_id}/complete")
def complete_consultation_endpoint(consultation_id: int, db: Session = Depends(get_db), doctor: User = Depends(RequireDoctor)):
    c = db.query(Consultation).filter(Consultation.id == consultation_id, Consultation.doctor_id == doctor.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    c.status = "completed"
    c.completed_at = datetime.utcnow()
    db.commit()
    return {"status": "completed"}


@app.get("/patient/visits", response_model=List[ConsultationResponse])
def patient_visits(language: str = "en", db: Session = Depends(get_db), patient: User = Depends(RequirePatient)):
    consultations = db.query(Consultation).filter(Consultation.patient_id == patient.id).order_by(Consultation.created_at.desc()).all()
    return [_consultation_response(c, db, language=language) for c in consultations]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
