# AI Test Automation Backend

Minimal FastAPI backend providing:
- GET /health
- CRUD /tests (in-memory, thread-safe)
- POST /tests/run (simulated execution, returns mock results)

## Quickstart

1) Create a virtual environment (optional but recommended)

python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

2) Install dependencies

pip install -r requirements.txt

3) Run the server

uvicorn main:app --host 0.0.0.0 --port 8000

OpenAPI docs will be available at:
- Swagger UI: http://localhost:8000/docs
- OpenAPI JSON: http://localhost:8000/openapi.json

CORS is configured for http://localhost:3000 and preview origins under *.cloud.kavia.ai.
