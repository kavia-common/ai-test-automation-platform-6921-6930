from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel, Field as SQLField, Session, create_engine, select
import os
import time
import random

# App metadata and tags for OpenAPI
app = FastAPI(
    title="AI Test Automation Backend",
    description="Minimal backend service providing health, DB-backed test CRUD, and run simulation.",
    version="0.2.0",
    openapi_tags=[
        {"name": "health", "description": "Service health and readiness"},
        {"name": "tests", "description": "CRUD operations for test cases"},
        {"name": "execution", "description": "Run test execution simulation"},
    ],
)

# CORS setup: allow localhost:3000 and generic preview origins
allowed_origins = [
    "http://localhost:3000",
    "https://localhost:3000",
]
# Allow any *.cloud.kavia.ai previews
allowed_origin_regex = r"https?:\/\/([a-zA-Z0-9\-]+\.)*cloud\.kavia\.ai(:\d+)?"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allowed_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup: read DATABASE_URL from environment, default to sqlite file in backend directory
def _default_db_url() -> str:
    # Default DB in project root/backend as ./data.db
    return os.getenv("DATABASE_URL", "sqlite:///./data.db")

DATABASE_URL = _default_db_url()
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

# SQLModel ORM
class TestCaseORM(SQLModel, table=True):
    """ORM model for persisted test cases."""
    id: Optional[int] = SQLField(default=None, primary_key=True)
    name: str
    # Persist steps as JSON encoded list via SQLModel / SQLite. Using TEXT and Pydantic for IO.
    steps_json: str = SQLField(default="[]", description="JSON array of steps")
    created_at: datetime = SQLField(default_factory=datetime.utcnow, nullable=False)

# I/O schemas - keep API contracts the same
class TestCase(BaseModel):
    """Model representing a test case."""
    id: int = Field(..., description="Unique identifier of the test case")
    name: str = Field(..., description="Name of the test case")
    steps: List[str] = Field(default_factory=list, description="List of steps")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")

class TestCaseCreate(BaseModel):
    """Payload for creating a test case."""
    name: str = Field(..., description="Name of the test case")
    steps: List[str] = Field(default_factory=list, description="List of steps")

class TestCaseUpdate(BaseModel):
    """Payload for updating a test case."""
    name: Optional[str] = Field(None, description="Name of the test case")
    steps: Optional[List[str]] = Field(None, description="List of steps")

class RunRequest(BaseModel):
    """Payload for executing a set of test cases."""
    ids: List[int] = Field(..., description="IDs of test cases to execute")

class RunResult(BaseModel):
    """Result of a single test execution."""
    id: int = Field(..., description="Test case id")
    name: str = Field(..., description="Test case name")
    status: str = Field(..., description="pass or fail")
    duration_ms: int = Field(..., description="Execution time in ms")

# Dependency: DB session per request
def get_session():
    with Session(engine) as session:
        yield session

# App lifecycle: create tables
@app.on_event("startup")
def on_startup():
    """Create database tables on startup if they don't exist."""
    # Ensure directory exists for SQLite relative path
    if DATABASE_URL.startswith("sqlite:///./"):
        os.makedirs(".", exist_ok=True)
    SQLModel.metadata.create_all(engine)

# Utilities to convert between ORM and API model
import json

def _to_api(tc: TestCaseORM) -> TestCase:
    steps = []
    try:
        steps = json.loads(tc.steps_json) if tc.steps_json else []
        if not isinstance(steps, list):
            steps = []
    except Exception:
        steps = []
    return TestCase(id=tc.id or 0, name=tc.name, steps=steps, created_at=tc.created_at)

def _from_steps(steps: Optional[List[str]]) -> str:
    return json.dumps(steps or [])

@app.get("/health", tags=["health"], summary="Healthcheck", description="Returns service health status")
def health():
    """Healthcheck endpoint.
    Returns:
      JSON object with status: 'ok'
    """
    return {"status": "ok"}

@app.get("/tests", response_model=List[TestCase], tags=["tests"], summary="List tests", description="Get all test cases")
def list_tests(session: Session = Depends(get_session)):
    """List all test cases from the database."""
    rows = session.exec(select(TestCaseORM).order_by(TestCaseORM.id)).all()
    return [_to_api(r) for r in rows]

@app.post("/tests", response_model=TestCase, tags=["tests"], summary="Create test", description="Create a new test case")
def create_test(payload: TestCaseCreate, session: Session = Depends(get_session)):
    """Create a new test case with the provided name and steps."""
    if not payload.name or not payload.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    row = TestCaseORM(name=payload.name.strip(), steps_json=_from_steps(payload.steps))
    session.add(row)
    session.commit()
    session.refresh(row)
    return _to_api(row)

@app.put("/tests/{test_id}", response_model=TestCase, tags=["tests"], summary="Update test", description="Update an existing test case")
def update_test(test_id: int, payload: TestCaseUpdate, session: Session = Depends(get_session)):
    """Update an existing test case by id."""
    row = session.get(TestCaseORM, test_id)
    if not row:
        raise HTTPException(status_code=404, detail="Test not found")
    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        row.name = name
    if payload.steps is not None:
        row.steps_json = _from_steps(payload.steps)
    session.add(row)
    session.commit()
    session.refresh(row)
    return _to_api(row)

@app.delete("/tests/{test_id}", tags=["tests"], summary="Delete test", description="Delete a test case by id")
def delete_test(test_id: int, session: Session = Depends(get_session)):
    """Delete a test case by id."""
    row = session.get(TestCaseORM, test_id)
    if not row:
        raise HTTPException(status_code=404, detail="Test not found")
    session.delete(row)
    session.commit()
    return {"status": "deleted"}

@app.post("/tests/run", response_model=Dict[str, List[RunResult]], tags=["execution"], summary="Run tests", description="Simulate running tests and return mock results")
def run_tests(req: RunRequest, session: Session = Depends(get_session)):
    """Run execution simulation for the given test ids.
    Parameters:
      - ids: list of test ids
    Returns:
      results: list of RunResult with pass/fail and duration_ms
    """
    if not req.ids:
        return {"results": []}
    rows = session.exec(select(TestCaseORM).where(TestCaseORM.id.in_(req.ids))).all()
    # Simulate execution time and results
    time.sleep(min(0.4, 0.05 * max(1, len(rows))))
    results: List[RunResult] = []
    for r in rows:
        status = "pass" if random.random() > 0.2 else "fail"
        duration = int(150 + random.random() * 600)
        results.append(RunResult(id=r.id or 0, name=r.name, status=status, duration_ms=duration))
    return {"results": results}
