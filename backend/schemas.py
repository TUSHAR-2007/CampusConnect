"""
schemas.py — Pydantic request/response models, categories, and statuses.

This is the single place that defines:
  - CATEGORIES : the four allowed issue categories (spec.md section 9)
  - STATUSES   : the three allowed issue statuses (spec.md section 10)
  - Request models: what the API accepts in request bodies
  - Response models: what the API sends back

The frontend never hard-codes categories; it fetches GET /categories which
returns this list. Keeping the list here ensures the frontend and backend
always agree.

Validation limits (spec.md Appendix B item 7):
  full_name   : 2–60 characters
  email       : valid format, max 120 characters
  password    : 6–100 characters
  title       : 3–100 characters
  description : 10–1000 characters
"""

import re

from pydantic import BaseModel, field_validator
from typing import Optional

# Simple email format pattern (no external package needed).
# Checks for something@something.something — sufficient for this project.
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ── Fixed value lists (spec.md sections 9 and 10) ─────────────────────────────

CATEGORIES: list[str] = ["Classroom", "Campus", "Lost & Found", "General"]
STATUSES: list[str] = ["Open", "In Progress", "Resolved"]


# ── Auth request models ────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2 or len(v) > 60:
            raise ValueError("Full name must be between 2 and 60 characters.")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if len(v) > 120:
            raise ValueError("Email must be 120 characters or fewer.")
        if not _EMAIL_RE.match(v):
            raise ValueError("Please enter a valid email address.")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6 or len(v) > 100:
            raise ValueError("Password must be between 6 and 100 characters.")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


# ── Auth response models ───────────────────────────────────────────────────────

class UserResponse(BaseModel):
    """User information returned on register (includes created_at per spec.md)."""
    id: int
    full_name: str
    email: str
    created_at: str


class LoginUserResponse(BaseModel):
    """User information nested inside the login response (no created_at per spec.md)."""
    id: int
    full_name: str
    email: str


class MeResponse(BaseModel):
    """
    Response for GET /auth/me (Profile page).
    Includes issues_reported count (spec.md section 12 GET /auth/me).
    """
    id: int
    full_name: str
    email: str
    created_at: str
    issues_reported: int


class LoginResponse(BaseModel):
    """Response for POST /auth/login."""
    token: str
    user: LoginUserResponse


# ── Issue request models ───────────────────────────────────────────────────────

class CreateIssueRequest(BaseModel):
    title: str
    description: str
    category: str

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3 or len(v) > 100:
            raise ValueError("Title must be between 3 and 100 characters.")
        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 10 or len(v) > 1000:
            raise ValueError("Description must be between 10 and 1000 characters.")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        v = v.strip()
        if v not in CATEGORIES:
            raise ValueError(f"Category must be one of: {', '.join(CATEGORIES)}.")
        return v


class UpdateStatusRequest(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        v = v.strip()
        if v not in STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(STATUSES)}.")
        return v


# ── Issue response model ───────────────────────────────────────────────────────

class IssueResponse(BaseModel):
    """
    Full issue object returned by GET /issues, GET /issues/{id},
    POST /issues, and PUT /issues/{id}/status.

    reporter_name is looked up from the users table and included here
    (spec.md section 8: "When returned by the API, an issue also includes
    reporter_name").
    """
    id: int
    title: str
    description: str
    category: str
    status: str
    reporter_id: int
    reporter_name: str
    created_at: str
    updated_at: str
