# AI Test Automation Backend

FastAPI backend providing:
- GET /health
- CRUD /tests (persisted via SQLite using SQLModel)
- POST /tests/run (simulated execution, returns mock results)

## Quickstart

1) Create a virtual environment (optional but recommended)

python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

2) Install dependencies

pip install -r requirements.txt

3) Configure environment (optional)

Copy .env.example to .env and set variables. If not set, DATABASE_URL defaults to sqlite:///./data.db.

4) Run the server

uvicorn main:app --host 0.0.0.0 --port 8000

OpenAPI docs will be available at:
- Swagger UI: http://localhost:8000/docs
- OpenAPI JSON: http://localhost:8000/openapi.json

CORS is configured for http://localhost:3000 and preview origins under *.cloud.kavia.ai.

## Persistence

- The service uses SQLModel/SQLAlchemy with SQLite by default.
- DATABASE_URL environment variable can override the database connection string.
- Default: sqlite:///./data.db (database file in backend directory).

Schema is created automatically on startup.
