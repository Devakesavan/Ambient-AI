"""
Ambient AI Healthcare - FastAPI Backend
Doctor-led, multilingual ambient AI for patient understanding.
"""
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from config import settings
from database import engine, get_db, Base
from auth import get_current_user, hash_password, verify_password, create_token, RequireDoctor, RequirePatient, RequireAdmin
from models import User, Consultation, Transcript, ClinicalReport, TeachBackItem, PatientReport, MedicalImage
from schemas import (
    LoginRequest, TokenResponse, UserResponse, PatientCreate, ConsultationCreate,
    ConsultationResponse, TranscriptResponse, ClinicalReportResponse, TeachBackItemResponse, PatientReportResponse, MedicalImageResponse,
)
from ai_service import transcribe_audio, extract_clinical_info, generate_teach_back_questions, compute_understanding_score, compute_overall_understanding_score, generate_patient_report, translate_text, translate_batch, extract_answer_for_question, extract_all_teach_back_answers
from storage import save_audio, save_transcript, save_medical_image, get_image_path, save_signature, get_signature_path
from email_service import send_welcome_email
from datetime import datetime
import string, random


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


def _generate_patient_uid(db: Session) -> str:
    """Generate a unique 5-character alphanumeric patient ID."""
    chars = string.ascii_uppercase + string.digits
    for _ in range(100):  # max retries
        uid = ''.join(random.choices(chars, k=5))
        if not db.query(User).filter(User.patient_uid == uid).first():
            return uid
    raise HTTPException(status_code=500, detail="Could not generate unique patient ID")


app = FastAPI(title="Ambient AI Healthcare API", version="1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins.split(","), allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def user_to_response(u: User) -> UserResponse:
    return UserResponse(id=u.id, patient_uid=u.patient_uid, email=u.email, full_name=u.full_name, role=u.role, phone=u.phone, address=u.address, preferred_language=u.preferred_language)


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
def create_patient(data: PatientCreate, db: Session = Depends(get_db), admin: User = Depends(RequireAdmin)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    patient_uid = _generate_patient_uid(db)
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role="patient",
        phone=data.phone,
        address=data.address,
        preferred_language=data.preferred_language or "en",
        patient_uid=patient_uid,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    # Send welcome email with credentials (sender = admin's email)
    print(f"[CreatePatient] Patient created: {user.full_name} ({user.email}), UID={patient_uid}")
    print(f"[CreatePatient] Admin sender: {admin.email}")
    print(f"[CreatePatient] Attempting to send welcome email...")
    try:
        send_welcome_email(
            sender_email=admin.email,
            to_email=user.email,
            patient_name=user.full_name or "Patient",
            patient_uid=patient_uid,
            password=data.password,
            phone=user.phone,
            address=user.address,
            language=user.preferred_language,
        )
        print(f"[CreatePatient] ✅ Email sent successfully")
    except Exception as e:
        print(f"[CreatePatient] ❌ Email FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
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
    
    # Get medical images
    images = db.query(MedicalImage).filter(MedicalImage.consultation_id == c.id).order_by(MedicalImage.created_at).all()
    image_responses = [
        MedicalImageResponse(
            id=img.id, consultation_id=img.consultation_id,
            filename=img.filename, original_filename=img.original_filename,
            image_type=img.image_type, description=img.description,
            created_at=img.created_at,
        )
        for img in images
    ]
    
    # Get doctor and patient info
    doctor = db.query(User).filter(User.id == c.doctor_id).first()
    patient = db.query(User).filter(User.id == c.patient_id).first()
    
    return ConsultationResponse(
        id=c.id, doctor_id=c.doctor_id, patient_id=c.patient_id, status=c.status,
        overall_understanding_score=c.overall_understanding_score,
        created_at=c.created_at, completed_at=c.completed_at,
        doctor_name=doctor.full_name if doctor else None,
        doctor_signature_filename=doctor.signature_filename if doctor else None,
        patient_name=patient.full_name if patient else None,
        transcript=transcript_data, clinical_report=clinical_data,
        teach_back_items=teach_back_responses,
        patient_report=patient_report_data,
        medical_images=image_responses,
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
    if not audio_bytes or len(audio_bytes) < 100:
        raise HTTPException(status_code=400, detail="Audio file is empty or too small. Please record or upload a valid audio file.")
    # Get file extension from uploaded filename for proper audio format handling
    filename = file.filename or "recording.webm"
    try:
        text = transcribe_audio(audio_bytes, consultation_id, filename)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
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
    
    try:
        full_text = transcribe_audio(audio_bytes, consultation_id, filename)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
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
    
    # Compute holistic overall score using Gemini
    per_scores = [tb.understanding_score or 0 for tb in items]
    overall = compute_overall_understanding_score(questions, answers, per_scores, correct_info)
    c.overall_understanding_score = overall
    print(f"[Teach-Back] Overall Understanding Score (Gemini): {overall}/100")
    
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


# ── Medical Image Endpoints ─────────────────────────────────────────────────

@app.post("/consultations/{consultation_id}/images")
def upload_medical_image(
    consultation_id: int,
    file: UploadFile = File(...),
    image_type: str = Form(default="other"),
    description: str = Form(default=""),
    db: Session = Depends(get_db),
    doctor: User = Depends(RequireDoctor)
):
    """Upload a medical image (X-ray, injury photo, etc.) for a consultation."""
    c = db.query(Consultation).filter(Consultation.id == consultation_id, Consultation.doctor_id == doctor.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/bmp"]
    if file.content_type and file.content_type.lower() not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only images (JPEG, PNG, GIF, WebP, BMP) are allowed.")
    
    # Read and save image
    image_bytes = file.file.read()
    if len(image_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="Image too large. Maximum size is 10MB.")
    
    stored_filename, filepath = save_medical_image(consultation_id, file.filename or "image.jpg", image_bytes)
    
    # Save to database
    img = MedicalImage(
        consultation_id=consultation_id,
        filename=stored_filename,
        original_filename=file.filename,
        image_type=image_type,
        description=description,
        file_path=filepath,
    )
    db.add(img)
    db.commit()
    db.refresh(img)
    
    return {"id": img.id, "filename": stored_filename, "status": "uploaded"}


@app.get("/images/{filename}")
def serve_image(filename: str, token: str = None, db: Session = Depends(get_db)):
    """Serve a medical image file. Accepts token via query parameter since <img> tags can't send headers."""
    from auth import decode_token as _decode_token
    import os
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    payload = _decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Find the image in database
    img = db.query(MedicalImage).filter(MedicalImage.filename == filename).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Check access: user must be the doctor or patient of this consultation
    c = db.query(Consultation).filter(Consultation.id == img.consultation_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    if user.role not in ("admin",) and user.id not in (c.doctor_id, c.patient_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    filepath = get_image_path(filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Image file not found")
    
    # Detect content type from extension
    ext = os.path.splitext(filename)[1].lower()
    media_types = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp'}
    media_type = media_types.get(ext, 'image/jpeg')
    
    return FileResponse(filepath, media_type=media_type)


@app.delete("/images/{image_id}")
def delete_medical_image(image_id: int, db: Session = Depends(get_db), doctor: User = Depends(RequireDoctor)):
    """Delete a medical image."""
    img = db.query(MedicalImage).filter(MedicalImage.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Check ownership
    c = db.query(Consultation).filter(Consultation.id == img.consultation_id, Consultation.doctor_id == doctor.id).first()
    if not c:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Delete file
    import os
    if os.path.exists(img.file_path):
        os.remove(img.file_path)
    
    db.delete(img)
    db.commit()
    return {"status": "deleted"}


# ── E-Signature endpoints ──────────────────────────────────────────────────────

@app.post("/doctor/signature")
async def upload_signature(file: UploadFile = File(...), db: Session = Depends(get_db), doctor: User = Depends(RequireDoctor)):
    """Upload or replace the doctor's e-signature image."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed for signatures.")
    image_bytes = await file.read()
    if len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Signature image must be under 5MB.")
    stored_filename = save_signature(doctor.id, file.filename or "signature.png", image_bytes)
    doctor.signature_filename = stored_filename
    db.commit()
    return {"status": "ok", "filename": stored_filename}


@app.get("/signatures/{filename}")
def serve_signature(filename: str, token: str = None):
    """Serve a signature image. Accepts token via query parameter."""
    import os
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    from auth import decode_token as _decode_token
    payload = _decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    filepath = get_signature_path(filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Signature not found")
    
    ext = os.path.splitext(filename)[1].lower()
    media_types = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp'}
    media_type = media_types.get(ext, 'image/png')
    return FileResponse(filepath, media_type=media_type)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
