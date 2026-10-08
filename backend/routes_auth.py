"""
routes_auth.py — Authentication endpoints.

Endpoints (spec.md section 12):
  POST /auth/register  — create a student account           (no auth required)
  POST /auth/login     — log in, receive a token            (no auth required)
  POST /auth/logout    — invalidate the current token       (auth required)
  GET  /auth/me        — logged-in student's information    (auth required)

Error conventions (spec.md section 12):
  409  email already registered
  401  wrong credentials or missing/invalid token
  422  Pydantic validation failure (FastAPI handles this automatically)
  500  unexpected database error (real error logged; generic message to client)
"""

import logging
import sqlite3
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response

from auth import check_password, generate_token, get_current_user, hash_password
from database import get_connection
from schemas import LoginRequest, LoginResponse, LoginUserResponse, MeResponse, RegisterRequest, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def _utcnow() -> str:
    """Return the current UTC time as an ISO-8601 string (e.g. 2026-10-07T10:00:00Z)."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ── POST /auth/register ────────────────────────────────────────────────────────

@router.post("/register", status_code=201, response_model=UserResponse)
def register(body: RegisterRequest):
    """
    Create a new student account.

    Request body: { "full_name": "...", "email": "...", "password": "..." }
    Success 201:  { "id": ..., "full_name": "...", "email": "...", "created_at": "..." }
    Errors:
      409 — email already registered
      422 — invalid input (handled by Pydantic)
      500 — database error
    """
    password_hash = hash_password(body.password)
    created_at = _utcnow()

    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO users (full_name, email, password_hash, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (body.full_name, body.email, password_hash, created_at),
        )
        conn.commit()
        row = conn.execute(
            "SELECT id, full_name, email, created_at FROM users WHERE email = ?",
            (body.email,),
        ).fetchone()
    except sqlite3.IntegrityError:
        # UNIQUE constraint on email was violated.
        raise HTTPException(
            status_code=409,
            detail="This email is already registered. Please log in.",
        )
    except Exception as exc:
        logger.error("register: unexpected error: %s", exc)
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")
    finally:
        conn.close()

    return UserResponse(
        id=row["id"],
        full_name=row["full_name"],
        email=row["email"],
        created_at=row["created_at"],
    )


# ── POST /auth/login ───────────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    """
    Authenticate a student and return a login token.

    Request body: { "email": "...", "password": "..." }
    Success 200:  { "token": "...", "user": { "id": ..., "full_name": ..., "email": ... } }
    Errors:
      401 — "Invalid email or password." (same message whether email or password is wrong,
             so the caller cannot determine which field failed — spec.md section 15)
      422 — invalid input
      500 — database error
    """
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ?",
            (body.email,),
        ).fetchone()
    except Exception as exc:
        logger.error("login: db lookup error: %s", exc)
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")
    finally:
        conn.close()

    # Use the same generic error message whether the email is missing or the
    # password is wrong, so we don't reveal which field is incorrect.
    if row is None or not check_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = generate_token()

    conn = get_connection()
    try:
        conn.execute(
            "UPDATE users SET token = ? WHERE id = ?",
            (token, row["id"]),
        )
        conn.commit()
    except Exception as exc:
        logger.error("login: token update error: %s", exc)
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")
    finally:
        conn.close()

    return LoginResponse(
        token=token,
        user=LoginUserResponse(
            id=row["id"],
            full_name=row["full_name"],
            email=row["email"],
        ),
    )


# ── POST /auth/logout ──────────────────────────────────────────────────────────

@router.post("/logout", status_code=204)
def logout(response: Response, current_user: dict = Depends(get_current_user)):
    """
    Invalidate the current login token (sets users.token to NULL).

    Success 204: no content.
    Errors:
      401 — missing or invalid token (handled by get_current_user dependency)
      500 — database error
    """
    conn = get_connection()
    try:
        conn.execute(
            "UPDATE users SET token = NULL WHERE id = ?",
            (current_user["id"],),
        )
        conn.commit()
    except Exception as exc:
        logger.error("logout: error: %s", exc)
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")
    finally:
        conn.close()

    # FastAPI returns 204 No Content automatically when the function returns None
    # and status_code=204 is set. No response body is sent.
    return None


# ── GET /auth/me ───────────────────────────────────────────────────────────────

@router.get("/me", response_model=MeResponse)
def me(current_user: dict = Depends(get_current_user)):
    """
    Return the logged-in student's profile information.

    Success 200: { "id": ..., "full_name": ..., "email": ..., "created_at": ...,
                   "issues_reported": <count> }
    Errors:
      401 — missing or invalid token
      500 — database error
    """
    conn = get_connection()
    try:
        count_row = conn.execute(
            "SELECT COUNT(*) AS cnt FROM issues WHERE reporter_id = ?",
            (current_user["id"],),
        ).fetchone()
    except Exception as exc:
        logger.error("me: error counting issues: %s", exc)
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")
    finally:
        conn.close()

    return MeResponse(
        id=current_user["id"],
        full_name=current_user["full_name"],
        email=current_user["email"],
        created_at=current_user["created_at"],
        issues_reported=count_row["cnt"],
    )
