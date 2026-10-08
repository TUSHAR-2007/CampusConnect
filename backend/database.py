"""
database.py — SQLite connection and table creation.

Opens a connection to the single SQLite file (backend/campusconnect.db).
Creates the `users` and `issues` tables if they do not already exist.
Always enables PRAGMA foreign_keys = ON so the reporter_id → users.id
relationship is enforced.

Two tables are defined (spec.md section 11):
  - users  : stores student accounts
  - issues : stores campus issue reports, linked to a user via reporter_id
"""

import sqlite3
import os

# The database file lives in the same directory as this module (backend/).
DB_PATH = os.path.join(os.path.dirname(__file__), "campusconnect.db")


def get_connection():
    """
    Open and return a SQLite connection to campusconnect.db.

    Row factory is set to sqlite3.Row so columns can be accessed by name
    (e.g. row["email"]) as well as by index — this keeps query code readable.

    Foreign-key support must be enabled per connection in SQLite, so we
    always run PRAGMA foreign_keys = ON immediately after connecting.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def create_tables():
    """
    Create the `users` and `issues` tables if they do not yet exist.

    Called once at server startup from main.py.
    Safe to run multiple times — CREATE TABLE IF NOT EXISTS is idempotent.

    Schema mirrors spec.md section 11 exactly:
      users.password_hash  stores "salt$hash" (PBKDF2, never the plain password)
      users.token          stores the current login token; NULL when logged out
      issues.status        defaults to "Open"; must be one of the three allowed values
      issues.reporter_id   foreign key → users.id
    """
    conn = get_connection()
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name     TEXT    NOT NULL,
                email         TEXT    NOT NULL UNIQUE,
                password_hash TEXT    NOT NULL,
                token         TEXT,
                created_at    TEXT    NOT NULL
            );

            CREATE TABLE IF NOT EXISTS issues (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                title       TEXT    NOT NULL,
                description TEXT    NOT NULL,
                category    TEXT    NOT NULL
                            CHECK(category IN ('Classroom','Campus','Lost & Found','General')),
                status      TEXT    NOT NULL DEFAULT 'Open'
                            CHECK(status IN ('Open','In Progress','Resolved')),
                reporter_id INTEGER NOT NULL
                            REFERENCES users(id),
                created_at  TEXT    NOT NULL,
                updated_at  TEXT    NOT NULL
            );
        """)
        conn.commit()
    finally:
        conn.close()
