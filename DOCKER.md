# Running Ambient AI Healthcare with Docker

## Quick start

1. **Create a `.env` file** in the `Ambient-AI` folder (copy from `.env.example`). At minimum set:
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD` so the first run creates an admin user you can use to log in.
   - Optionally: `SECRET_KEY`, `GEMINI_API_KEY`, `MS_GRAPH_ACCESS_TOKEN`.

2. **Build and run:**
   ```bash
   cd Ambient-AI
   docker compose up --build
   ```

3. **Open the app:** http://localhost  
   Log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set. The admin user is only created when the database is empty (first run).

## Services

| Service   | Role                                      | Port (host) |
|----------|-------------------------------------------|-------------|
| frontend | React app served by nginx, proxies `/api` to backend | 80          |
| backend  | FastAPI + SQLite + Whisper + Gemini       | internal only (8000) |

- **Database:** SQLite file at `/app/data/ambient_ai.db` inside the backend container, persisted in the `backend_data` volume.
- **Storage:** Uploads (audio, images, signatures) under `/app/data/storage`, same volume.

## First-time login and database

- On first run, if `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set in `.env`, the backend creates an **admin** user. If `DOCTOR_EMAIL` and `DOCTOR_PASSWORD` are also set, it creates a **doctor** user. Use those credentials to log in.
- After login as admin, you can create **patients** from the admin dashboard.
- Tables are created automatically on backend startup (`Base.metadata.create_all`).

## Optional env vars (`.env`)

| Variable | Description |
|----------|-------------|
| `ADMIN_EMAIL` | Email for the initial admin (created only when DB is empty). |
| `ADMIN_PASSWORD` | Password for the initial admin. |
| `ADMIN_NAME` | Display name for the initial admin (default: Admin). |
| `DOCTOR_EMAIL` | Optional: create an initial doctor when DB is empty. |
| `DOCTOR_PASSWORD` | Password for the initial doctor. |
| `DOCTOR_NAME` | Display name for the initial doctor (default: Doctor). |
| `SECRET_KEY` | JWT secret; set a long random string in production. |
| `GEMINI_API_KEY` | For AI features (extraction, translation, reports). |
| `WHISPER_MODEL` | Whisper model name (e.g. `tiny`, `base`). |
| `MS_GRAPH_ACCESS_TOKEN` | For sending welcome emails (optional). |

## Stopping and data

- `docker compose down` stops containers but **keeps** the `backend_data` volume (DB and storage).
- To reset DB and storage: `docker compose down -v` (removes volumes). Then on next `up`, set `ADMIN_EMAIL`/`ADMIN_PASSWORD` again to recreate the initial admin.
