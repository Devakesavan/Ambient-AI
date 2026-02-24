# Ambient AI — Healthcare

**Doctor-led, multilingual ambient AI for patient understanding.**

Ambient AI is a healthcare application that supports doctors during consultations with automatic transcription, clinical extraction, teach-back assessment, and patient-facing reports—with multilingual support (English, Tamil, Hindi) and an optional audio summary for patients.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Docker Deployment](#docker-deployment)
- [API Overview](#api-overview)
- [License](#license)

---

## Overview

Ambient AI Healthcare combines **speech-to-text** (Whisper), **AI-powered clinical extraction** (Gemini), and **multilingual translation** to:

- Record and transcribe doctor–patient conversations
- Extract symptoms, diagnosis, medications, and follow-up automatically
- Generate teach-back questions and assess patient understanding
- Produce take-home reports and PDFs for patients
- Let patients view visit history, reports, and medical images in their preferred language, with an optional **audio summary** of the full clinical report

The system has three roles: **Admin**, **Doctor**, and **Patient**, each with a dedicated dashboard.

---

## Features

| Area | Description |
|------|-------------|
| **Ambient transcription** | Upload consultation audio; transcribe with **OpenAI Whisper** (runs locally, optional GPU). |
| **Clinical extraction** | **Google Gemini** extracts symptoms, diagnosis, medications, and follow-up from the transcript. |
| **Teach-back** | AI-generated questions to assess patient understanding; score per question and overall. |
| **Patient reports** | Auto-generated take-home reports (diagnosis summary, medication instructions, warning signs). |
| **Multilingual** | UI and reports in **English**, **Tamil**, and **Hindi**; translation via deep-translator / Gemini. |
| **Patient portal** | Visit history, transcripts, clinical report, PDF download, medical images, **audio summary** (text-to-speech of full report). |
| **Doctor workflow** | Manage patients, start consultations, upload audio/images, add e-signature, complete visits. |
| **Admin** | Create and manage patients (unique patient UID), optional welcome email (Microsoft Graph). |
| **Docker** | Single-command run with `docker compose`; SQLite and file storage persisted in volumes. |

---

## Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Backend** | Python 3, **FastAPI**, **SQLAlchemy**, **Uvicorn** |
| **Database** | SQLite (file-based; path configurable) |
| **Auth** | JWT (python-jose), bcrypt |
| **AI / ML** | **OpenAI Whisper** (speech-to-text), **Google Gemini** (extraction, translation), **deep-translator** |
| **Frontend** | **React 18**, **Vite**, **React Router**, **Tailwind CSS**, **jsPDF** (PDF export) |
| **Deployment** | Docker, Docker Compose, nginx (frontend), single backend service |

---

## Project Structure

```
Ambient-AI/
├── backend/                 # FastAPI application
│   ├── main.py              # Routes, auth, consultations, uploads
│   ├── config.py            # Settings (env-based)
│   ├── database.py          # SQLAlchemy engine, session
│   ├── models.py            # User, Consultation, Transcript, ClinicalReport, etc.
│   ├── schemas.py           # Pydantic request/response models
│   ├── auth.py              # JWT, role-based access (doctor, patient, admin)
│   ├── ai_service.py        # Whisper transcription, Gemini extraction/translation
│   ├── storage.py           # Audio, images, signatures, transcripts
│   ├── email_service.py     # Optional welcome email (MS Graph)
│   ├── requirements.txt
│   ├── seed_admin.py        # First-time admin/doctor seeding
│   └── scripts/
├── frontend/                # React SPA
│   ├── src/
│   │   ├── App.jsx          # Routes, protected by role
│   │   ├── api.js           # Backend API client
│   │   ├── contexts/        # Auth context
│   │   ├── pages/           # Landing, Login, DoctorDashboard, PatientDashboard, AdminDashboard
│   │   └── components/      # Layout, DownloadReportPDF, ECG3DLoader, etc.
│   ├── package.json
│   └── vite.config.js
├── .env.example             # Example environment variables
├── DOCKER.md                # Docker-specific documentation
├── package.json             # Root scripts (e.g. concurrent dev)
└── README.md                # This file
```

---

## Prerequisites

- **Python 3.10+** (for local backend)
- **Node.js 18+** and npm (for local frontend)
- **FFmpeg** (for Whisper; backend can use `imageio-ffmpeg`)
- **Optional:** NVIDIA GPU + CUDA for faster Whisper transcription
- **Optional:** Google Gemini API key for clinical extraction and translation
- **Optional:** Microsoft Graph access token for welcome emails

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Devakesavan/Ambient-AI.git
cd Ambient-AI
```

### 2. Backend (Python)

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/` (see [Configuration](#configuration)).

Run the API:

```bash
python main.py
# Or: uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend (React)

From the project root:

```bash
cd frontend
npm install
npm run dev
```

The app is typically available at `http://localhost:5173`. Ensure the backend URL in the frontend (e.g. in `api.js` or env) points to your backend (e.g. `http://localhost:8000`).

### 4. Run both (from root)

```bash
npm run dev
```

This uses `concurrently` to start backend and frontend together.

---

## Configuration

Copy `.env.example` to `.env` (in `backend/` for local run, or in project root for Docker) and adjust:

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | JWT signing key; use a long random string in production. |
| `GEMINI_API_KEY` | Google Gemini API key for clinical extraction and translation. |
| `WHISPER_MODEL` | Whisper model name (e.g. `tiny`, `base`, `small`). |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | First-time admin user (Docker / seed script). |
| `DOCTOR_EMAIL` / `DOCTOR_PASSWORD` | Optional first-time doctor user. |
| `MS_GRAPH_ACCESS_TOKEN` | Optional; for sending welcome emails to new patients. |
| `DATABASE_URL` | Default: `sqlite:///./ambient_ai.db`. |
| `CORS_ORIGINS` | Comma-separated origins for the frontend (e.g. `http://localhost:5173`). |

See `.env.example` and `DOCKER.md` for a full list and Docker-specific notes.

---

## Usage

1. **First run**  
   Use `seed_admin.py` or Docker with `ADMIN_EMAIL`/`ADMIN_PASSWORD` to create an admin. Optionally create a doctor the same way.

2. **Admin**  
   Log in as admin → create patients (email, password, name). Patients can be given a unique patient UID for identification.

3. **Doctor**  
   Log in as doctor → select a patient → start a consultation → upload consultation audio.  
   Backend transcribes (Whisper), extracts clinical data (Gemini), and can generate teach-back questions. Doctor uploads teach-back answers, adds medical images and e-signature if needed, generates the patient report, and completes the consultation.

4. **Patient**  
   Log in as patient → view visit history → select a visit to see transcript, clinical report, take-home report, medical images, and understanding scores. Download PDF report and use **Listen to visit summary** for an audio summary of the full clinical report.

---

## Docker Deployment

For a single-command run with Docker:

1. Copy `.env.example` to `.env` and set at least `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
2. From the project root:

   ```bash
   docker compose up --build
   ```

3. Open **http://localhost** and log in with the admin credentials.

Database (SQLite) and storage (uploads) are persisted in Docker volumes. See **DOCKER.md** for details (ports, volumes, optional env vars, reset instructions).

---

## API Overview

| Category | Endpoints (examples) |
|----------|----------------------|
| **Auth** | `POST /auth/login`, `GET /auth/me` |
| **Admin** | `GET /admin/patients`, `POST /admin/patients` |
| **Doctor** | `GET /doctor/patients`, `POST /doctor/consultations`, `GET /doctor/consultations`, upload audio/images/signature, generate report, complete consultation |
| **Patient** | `GET /patient/visits` (with optional language) |

All authenticated endpoints use a Bearer JWT. Roles are enforced (admin, doctor, patient).

---

## License

This project is provided as-is for educational and healthcare-support use. See the repository for any license file or terms applicable to your use.

---

## Repository

**GitHub:** [https://github.com/Devakesavan/Ambient-AI](https://github.com/Devakesavan/Ambient-AI)

For Docker-only setup and troubleshooting, refer to **DOCKER.md** in the project root.
