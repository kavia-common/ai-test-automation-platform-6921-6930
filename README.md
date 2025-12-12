# ai-test-automation-platform-6921-6930

This repository now includes:
- Frontend (React) at `frontend/` with a static app under `frontend/public/`
- Backend (FastAPI) at `backend/` providing health, DB-backed test CRUD, and run simulation

Quickstart:
1. Frontend
   - Copy `frontend/.env.example` to `frontend/.env` and set `REACT_APP_API_BASE`
   - `cd frontend && npm start`
2. Backend
   - `cd backend && pip install -r requirements.txt`
   - Optionally copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` (defaults to `sqlite:///./data.db`)
   - `uvicorn main:app --host 0.0.0.0 --port 8000`