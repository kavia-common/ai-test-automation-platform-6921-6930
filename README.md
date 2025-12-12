# ai-test-automation-platform-6921-6930

This repository now includes:
- Frontend (React) at `frontend/` with a static app under `frontend/public/`
- Backend (FastAPI) at `backend/` providing health, test CRUD, and run simulation

Quickstart:
1. Frontend
   - Copy `frontend/.env.example` to `frontend/.env` and set `REACT_APP_API_BASE`
   - `cd frontend && npm start`
2. Backend
   - `cd backend && pip install -r requirements.txt`
   - `uvicorn main:app --host 0.0.0.0 --port 8000`