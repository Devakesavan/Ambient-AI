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

Follow these steps to run Ambient AI locally (without Docker).

### Step 1 — Verify prerequisites

Ensure you have the required tools installed:

```bash
# Python 3.10 or higher
python --version

# Node.js 18+ and npm
node --version
npm --version
```

- **Python:** Install from [python.org](https://www.python.org/downloads/) or your package manager. On Windows, tick "Add Python to PATH".
- **Node.js:** Install from [nodejs.org](https://nodejs.org/) (LTS recommended).
- **FFmpeg:** Required for Whisper. The backend can use `imageio-ffmpeg` (installed via `requirements.txt`); on some systems you may need to [install FFmpeg](https://ffmpeg.org/download.html) separately.

### Step 2 — Clone the repository

```bash
git clone https://github.com/Devakesavan/Ambient-AI.git
cd Ambient-AI
```

### Step 3 — Backend setup

**3.1 Create and activate a virtual environment**

```bash
cd backend
python -m venv venv
```

Activate the virtual environment:

- **Windows (Command Prompt):** `venv\Scripts\activate`
- **Windows (PowerShell):** `venv\Scripts\Activate.ps1`
- **macOS / Linux:** `source venv/bin/activate`

You should see `(venv)` in your terminal prompt.

**3.2 Install Python dependencies**

```bash
pip install -r requirements.txt
```

**3.3 Create environment file**

Copy the example env file and edit as needed:

```bash
# From the backend/ directory (Windows CMD/PowerShell)
copy ..\.env.example .env

# From the backend/ directory (macOS / Linux)
cp ../.env.example .env
```

Edit `.env` and set at least:

- `SECRET_KEY` — use a long random string in production
- `GEMINI_API_KEY` — optional but recommended for clinical extraction and translation (get from [Google AI Studio](https://aistudio.google.com/apikey))

See [Configuration](#configuration) for all options.

**3.4 Create the first admin (and optional doctor)**

Run the seed script so you can log in:

```bash
python seed_admin.py
```

Follow the prompts, or ensure `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set in `.env` so the script can create the admin user.

**3.5 Start the backend**

```bash
python main.py
```

The API runs at **http://localhost:8000**. You should see a message that the server is running. Keep this terminal open.

### Step 4 — Frontend setup

Open a **new terminal** and go to the project root, then into the frontend folder:

```bash
cd Ambient-AI
cd frontend
```

**4.1 Install Node dependencies**

```bash
npm install
```

**4.2 Start the frontend**

```bash
npm run dev
```

The app is served at **http://localhost:5173** (or the port Vite prints). The frontend is configured to call the backend at `http://localhost:8000`; if your backend runs elsewhere, update the API base URL in `frontend/src/api.js` (or via env if you add one).

### Step 5 — Run backend and frontend together (optional)

From the **project root** (not inside `backend/` or `frontend/`):

```bash
npm install
npm run dev
```

This uses `concurrently` to start both the backend and the frontend in one command. Useful for daily development.

### Step 6 — Confirm installation

1. Open **http://localhost:5173** in your browser.
2. You should see the Ambient AI landing page; click **Get Started** (or go to `/login`).
3. Log in with the admin credentials you created with `seed_admin.py`.
4. You should see the Admin dashboard and be able to create patients, or log in as a doctor if you created one.

**Summary**

| Step | Command / action |
|------|-------------------|
| 1 | Check `python --version`, `node --version` |
| 2 | `git clone ...` and `cd Ambient-AI` |
| 3 | `cd backend` → `python -m venv venv` → activate venv → `pip install -r requirements.txt` → copy `.env.example` to `.env` → `python seed_admin.py` → `python main.py` |
| 4 | New terminal: `cd frontend` → `npm install` → `npm run dev` |
| 5 | (Optional) From root: `npm run dev` to run both |
| 6 | Open http://localhost:5173 and log in |

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
## Image

![WhatsApp Image 2026-02-24 at 7 36 00 AM](https://github.com/user-attachments/assets/0fd4ec1b-2d67-4964-a587-6678222990f3)
![WhatsApp Image 2026-02-24 at 7 33 56 AM](https://github.com/user-attachments/assets/eb111104-4b61-496f-a915-014f300a8700)
<img width="2558" height="1390" alt="image" src="https://github.com/user-attachments/assets/8189ade6-45da-4190-bd68-8b2d6b489ea9" />
<img width="2559" height="1403" alt="image" src="https://github.com/user-attachments/assets/1c174873-8d25-47ee-bacf-1401e4d8236f" />

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
