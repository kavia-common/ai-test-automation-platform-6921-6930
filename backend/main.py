from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from threading import Lock
from datetime import datetime
import time
import random

# App metadata and tags for OpenAPI
app = FastAPI(
    title="AI Test Automation Backend",
    description="Minimal backend service providing health, in-memory test CRUD, and run simulation.",
    version="0.1.0",
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

# In-memory store with thread safety
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

class Store:
    """Thread-safe in-memory store for test cases."""
    def __init__(self):
        self._lock = Lock()
        self._seq = 0
        self._items: Dict[int, TestCase] = {}

    def _next_id(self) -> int:
        with self._lock:
            self._seq += 1
            return self._seq

    # PUBLIC_INTERFACE
    def list(self) -> List[TestCase]:
        """Return all test cases."""
        with self._lock:
            return list(self._items.values())

    # PUBLIC_INTERFACE
    def create(self, payload: TestCaseCreate) -> TestCase:
        """Create a new test case."""
        with self._lock:
            tid = self._next_id()
            item = TestCase(id=tid, name=payload.name, steps=payload.steps, created_at=datetime.utcnow())
            self._items[tid] = item
            return item

    # PUBLIC_INTERFACE
    def update(self, tid: int, payload: TestCaseUpdate) -> TestCase:
        """Update an existing test case."""
        with self._lock:
            if tid not in self._items:
                raise KeyError(tid)
            current = self._items[tid]
            new_name = payload.name if payload.name is not None else current.name
            new_steps = payload.steps if payload.steps is not None else current.steps
            updated = TestCase(id=current.id, name=new_name, steps=new_steps, created_at=current.created_at)
            self._items[tid] = updated
            return updated

    # PUBLIC_INTERFACE
    def delete(self, tid: int) -> None:
        """Delete a test case by id."""
        with self._lock:
            if tid not in self._items:
                raise KeyError(tid)
            del self._items[tid]

    # PUBLIC_INTERFACE
    def get_many(self, ids: List[int]) -> List[TestCase]:
        """Get multiple test cases by id; ignores missing ids."""
        with self._lock:
            return [self._items[i] for i in ids if i in self._items]


store = Store()

@app.get("/health", tags=["health"], summary="Healthcheck", description="Returns service health status")
def health():
    """Healthcheck endpoint.
    Returns:
      JSON object with status: 'ok'
    """
    return {"status": "ok"}

@app.get("/tests", response_model=List[TestCase], tags=["tests"], summary="List tests", description="Get all test cases")
def list_tests():
    """List all test cases in the in-memory store."""
    return store.list()

@app.post("/tests", response_model=TestCase, tags=["tests"], summary="Create test", description="Create a new test case")
def create_test(payload: TestCaseCreate):
    """Create a new test case with the provided name and steps."""
    return store.create(payload)

@app.put("/tests/{test_id}", response_model=TestCase, tags=["tests"], summary="Update test", description="Update an existing test case")
def update_test(test_id: int, payload: TestCaseUpdate):
    """Update an existing test case by id."""
    try:
        return store.update(test_id, payload)
    except KeyError:
        raise HTTPException(status_code=404, detail="Test not found")

@app.delete("/tests/{test_id}", tags=["tests"], summary="Delete test", description="Delete a test case by id")
def delete_test(test_id: int):
    """Delete a test case by id."""
    try:
        store.delete(test_id)
        return {"status": "deleted"}
    except KeyError:
        raise HTTPException(status_code=404, detail="Test not found")

@app.post("/tests/run", response_model=Dict[str, List[RunResult]], tags=["execution"], summary="Run tests", description="Simulate running tests and return mock results")
def run_tests(req: RunRequest):
    """Run execution simulation for the given test ids.
    Parameters:
      - ids: list of test ids
    Returns:
      results: list of RunResult with pass/fail and duration_ms
    """
    tests = store.get_many(req.ids)
    # Simulate execution time and results
    time.sleep(min(0.4, 0.05 * max(1, len(tests))))
    results: List[RunResult] = []
    for t in tests:
        status = "pass" if random.random() > 0.2 else "fail"
        duration = int(150 + random.random() * 600)
        results.append(RunResult(id=t.id, name=t.name, status=status, duration_ms=duration))
    return {"results": results}
