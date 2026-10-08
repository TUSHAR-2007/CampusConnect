"""
auth.py — Password hashing, token generation, and current-user lookup.

Security approach (spec.md section 15):
  - Passwords are NEVER stored in plain text.
  - We use PBKDF2-HMAC-SHA256 (Python's standard hashlib) with a unique
    random salt per user. The stored value is "salt$hash" (both hex-encoded).
  - Login tokens are random URL-safe strings (secrets.token_urlsafe(32)).
    They are stored in users.token and cleared on logout.
  - Authenticated requests send the token as: Authorization: Bearer <token>
  - reporter_id always comes from the verified token, never from the request body.

No third-party auth library is used (no JWT, no passlib). Only the Python
standard library: hashlib, secrets, os.
"""

import hashlib
import secrets
import os

from fastapi import Header, HTTPException
from database import get_connection


# ── Password hashing ───────────────────────────────────────────────────────────

def hash_password(plain_password: str) -> str:
    """
    Hash a plain-text password with PBKDF2-HMAC-SHA256.

    Steps:
      1. Generate a 16-byte random salt, hex-encode it.
      2. Run PBKDF2-HMAC-SHA256 with 260,000 iterations (NIST recommendation).
      3. Return "salt_hex$hash_hex" — this single string is stored in the DB.

    The salt is stored alongside the hash so we can re-derive the same hash
    at login time.
    """
    salt = os.urandom(16)
    salt_hex = salt.hex()
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        plain_password.encode("utf-8"),
        salt,
        260_000,
    )
    hash_hex = dk.hex()
    return f"{salt_hex}${hash_hex}"


def check_password(plain_password: str, stored_hash: str) -> bool:
    """
    Verify a plain-text password against a stored "salt$hash" string.

    Splits the stored value, re-derives the hash with the same salt, and
    compares with secrets.compare_digest to prevent timing attacks.
    Returns True if the password matches, False otherwise.
    """
    try:
        salt_hex, hash_hex = stored_hash.split("$", 1)
    except ValueError:
        # Stored value is malformed — treat as wrong password.
        return False

    salt = bytes.fromhex(salt_hex)
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        plain_password.encode("utf-8"),
        salt,
        260_000,
    )
    return secrets.compare_digest(dk.hex(), hash_hex)


# ── Token generation ───────────────────────────────────────────────────────────

def generate_token() -> str:
    """
    Generate a random, URL-safe login token (43 characters).

    secrets.token_urlsafe(32) produces 32 bytes of randomness, base64-encoded
    to ~43 characters. This is stored in users.token and sent to the client.
    """
    return secrets.token_urlsafe(32)


# ── Current user dependency ────────────────────────────────────────────────────

def get_current_user(authorization: str = Header(default=None)):
    """
    FastAPI dependency that validates the Authorization header and returns
    the logged-in user row from the database.

    Expects: Authorization: Bearer <token>

    Raises HTTP 401 if:
      - The header is missing or not in "Bearer <token>" format.
      - The token does not match any user in the database.
      - The token field in the database is NULL (user is logged out).

    On success, returns a dict with the full user row.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please log in.",
        )

    token = authorization[len("Bearer "):].strip()
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please log in.",
        )

    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM users WHERE token = ?",
            (token,),
        ).fetchone()
    finally:
        conn.close()

    if row is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired session. Please log in again.",
        )

    return dict(row)
