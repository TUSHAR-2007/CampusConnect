"""
main.py — FastAPI application entry point.

Responsibilities (spec.md section 14):
  1. Create the FastAPI app.
  2. Call create_tables() on startup so the database is always ready.
  3. Include the auth and issues routers.
  4. Mount the frontend/ folder as static files at "/" so one server
     serves both the API and the HTML pages.

Run command (from the backend/ directory):
  uvicorn main:app --reload

Then open: http://127.0.0.1:8000
API docs:  http://127.0.0.1:8000/docs

The frontend is mounted AFTER the routers so that API paths take
priority over static file matching. This means /auth/register reaches
the router, not a file called "auth/register".
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from database import create_tables
from routes_auth import router as auth_router
from routes_issues import router as issues_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on server start if they do not already exist."""
    create_tables()
    yield  # Server runs here.


app = FastAPI(
    title="CampusConnect",
    description="A simple campus issue-reporting app for college students.",
    version="1.0.0",
    lifespan=lifespan,
)


# Include routers first so API paths resolve before static file matching.
app.include_router(auth_router)
app.include_router(issues_router)

# Mount the frontend/ directory at "/" so the HTML pages are served.
# The frontend/ folder is one level above backend/, so we resolve the path
# relative to this file's location.
_frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
_frontend_dir = os.path.abspath(_frontend_dir)

if os.path.isdir(_frontend_dir):
    app.mount("/", StaticFiles(directory=_frontend_dir, html=True), name="frontend")
