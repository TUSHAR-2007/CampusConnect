"""
routes_issues.py — Issue and category endpoints.

Endpoints (spec.md section 12):
  GET  /categories              — list supported categories          (no auth)
  GET  /issues                  — list all issues, newest first      (auth required)
  POST /issues                  — create an issue                   (auth required)
  GET  /issues/{id}             — get one issue by ID               (auth required)
  PUT  /issues/{id}/status      — update an issue's status          (auth required)

Error conventions (spec.md section 12):
  401  missing or invalid token
  404  issue not found
  422  Pydantic validation failure (invalid category, bad status, etc.)
  500  unexpected database error (real error logged; generic message to client)

reporter_id always comes from the verified token, never from the request body
(spec.md sections 12 and 15).
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from database import get_connection
from schemas import (
    CATEGORIES,
    CreateIssueRequest,
    IssueResponse,
    UpdateStatusRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["issues"])


def _utcnow() -> str:
    """Return the current UTC time as an ISO-8601 string."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _row_to_issue(row) -> IssueResponse:
    """Convert a database row (with reporter_name joined) to an IssueResponse."""
    return IssueResponse(
        id=row["id"],
        title=row["title"],
        description=row["description"],
        category=row["category"],
        status=row["status"],
        reporter_id=row["reporter_id"],
        reporter_name=row["reporter_name"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


# SQL that fetches one or many issues and includes the reporter's full_name.
# We join users so the frontend never needs a separate lookup.
_ISSUE_SELECT = """
    SELECT
        i.id,
        i.title,
        i.description,
        i.category,
        i.status,
        i.reporter_id,
        u.full_name AS reporter_name,
        i.created_at,
        i.updated_at
    FROM issues i
    JOIN users u ON u.id = i.reporter_id
"""


# ── GET /categories ────────────────────────────────────────────────────────────

@router.get("/categories")
def get_categories():
    """
    Return the list of supported issue categories.

    Success 200: ["Classroom", "Campus", "Lost & Found", "General"]
    No authentication required (spec.md section 12).
    """
    return CATEGORIES


# ── GET /issues ────────────────────────────────────────────────────────────────

@router.get("/issues", response_model=list[IssueResponse])
def list_issues(current_user: dict = Depends(get_current_user)):
    """
    Return all issues, newest first.

    Success 200: array of issue objects.
    Errors:
      401 — missing or invalid token
      500 — database error
    """
    conn = get_connection()
    try:
        rows = conn.execute(
            _ISSUE_SELECT + " ORDER BY i.created_at DESC, i.id DESC"
        ).fetchall()
    except Exception as exc:
        logger.error("list_issues: error: %s", exc)
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")
    finally:
        conn.close()

    return [_row_to_issue(row) for row in rows]


# ── POST /issues ───────────────────────────────────────────────────────────────

@router.post("/issues", status_code=201, response_model=IssueResponse)
def create_issue(body: CreateIssueRequest, current_user: dict = Depends(get_current_user)):
    """
    Create a new issue linked to the logged-in student.

    Request body: { "title": "...", "description": "...", "category": "..." }
    Success 201: the created issue object (status is always "Open").

    reporter_id comes from the verified token — never from the request body.

    Errors:
      401 — missing or invalid token
      422 — missing field, too short/long, unknown category (handled by Pydantic)
      500 — database error
    """
    now = _utcnow()
    reporter_id = current_user["id"]

    conn = get_connection()
    try:
        cursor = conn.execute(
            """
            INSERT INTO issues (title, description, category, status, reporter_id,
                                created_at, updated_at)
            VALUES (?, ?, ?, 'Open', ?, ?, ?)
            """,
            (body.title, body.description, body.category, reporter_id, now, now),
        )
        conn.commit()
        new_id = cursor.lastrowid
        row = conn.execute(
            _ISSUE_SELECT + " WHERE i.id = ?",
            (new_id,),
        ).fetchone()
    except Exception as exc:
        logger.error("create_issue: error: %s", exc)
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")
    finally:
        conn.close()

    return _row_to_issue(row)


# ── GET /issues/{id} ───────────────────────────────────────────────────────────

@router.get("/issues/{issue_id}", response_model=IssueResponse)
def get_issue(issue_id: int, current_user: dict = Depends(get_current_user)):
    """
    Return one issue by its ID.

    Success 200: the issue object.
    Errors:
      401 — missing or invalid token
      404 — issue not found
      500 — database error
    """
    conn = get_connection()
    try:
        row = conn.execute(
            _ISSUE_SELECT + " WHERE i.id = ?",
            (issue_id,),
        ).fetchone()
    except Exception as exc:
        logger.error("get_issue: error for id=%s: %s", issue_id, exc)
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")
    finally:
        conn.close()

    if row is None:
        raise HTTPException(status_code=404, detail="Issue not found.")

    return _row_to_issue(row)


# ── PUT /issues/{id}/status ────────────────────────────────────────────────────

@router.put("/issues/{issue_id}/status", response_model=IssueResponse)
def update_status(
    issue_id: int,
    body: UpdateStatusRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Update the status of an existing issue.

    Request body: { "status": "In Progress" }
    Success 200: the updated issue object (updated_at is refreshed).

    Any logged-in student may update any issue's status.
    Any of the three status values may be set at any time
    (spec.md section 10 decision: corrections are allowed).

    Errors:
      401 — missing or invalid token
      404 — issue not found
      422 — status not one of the three allowed values (handled by Pydantic)
      500 — database error
    """
    now = _utcnow()

    conn = get_connection()
    try:
        # Check the issue exists before updating.
        exists = conn.execute(
            "SELECT id FROM issues WHERE id = ?",
            (issue_id,),
        ).fetchone()

        if exists is None:
            raise HTTPException(status_code=404, detail="Issue not found.")

        conn.execute(
            "UPDATE issues SET status = ?, updated_at = ? WHERE id = ?",
            (body.status, now, issue_id),
        )
        conn.commit()

        row = conn.execute(
            _ISSUE_SELECT + " WHERE i.id = ?",
            (issue_id,),
        ).fetchone()
    except HTTPException:
        raise  # Re-raise our own 404; don't wrap it in a 500.
    except Exception as exc:
        logger.error("update_status: error for id=%s: %s", issue_id, exc)
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")
    finally:
        conn.close()

    return _row_to_issue(row)
