# CampusConnect — Antigravity Development Rules

This file is the permanent rulebook for any AI coding agent working on CampusConnect. **Read it fully before every development task.**

---

## 1. Project Identity

CampusConnect is a small campus-issue reporting website for college students. A student registers, logs in, creates an issue (title, description, category), views issues on a dashboard, opens issue details, and updates an issue's status (Open, In Progress, Resolved). It also has a simple Profile page.

It is a **4-day learning project** built by 4 students: one second-year technical lead and three first-year beginners. The goal is a small, polished, genuinely working full-stack app and good GitHub teamwork — **not** a large production platform.

## 2. Source of Truth

| File | Role |
|------|------|
| Official project PDF (*Code2Chill — Weekly Project 01*) | Original requirements source |
| `spec.md` | Primary project specification (requirements, pages, DB, API) |
| `brief.md` | Product vision summary |
| `README.md` | Setup and usage |

**If documents conflict:** official PDF > `spec.md` > `brief.md` > implementation assumptions.

If you notice a conflict, report it. Do not silently pick one.

## 3. Non-Negotiable Technology Rules

Approved stack only:

- **Frontend:** HTML, CSS, vanilla JavaScript
- **Backend:** Python, FastAPI (run with Uvicorn)
- **Database:** SQLite (Python's built-in `sqlite3`)
- **Version control:** Git, GitHub

**Forbidden unless the team explicitly approves in writing:** React, Next.js, Vue, Node.js/npm tooling, TypeScript, Tailwind, Bootstrap, jQuery, any CSS/JS framework or CDN library, MongoDB, PostgreSQL/MySQL, Firebase, Supabase, SQLAlchemy or other ORMs, Docker.

Python dependencies are limited to `fastapi` and `uvicorn` unless approved.

## 4. Coding Philosophy

- Prefer simple, readable, maintainable code.
- Avoid over-engineering and unnecessary abstractions.
- Do not duplicate logic; put shared code in one place.
- Keep functions short and focused on one job.
- Use meaningful names (`get_issue_by_id`, not `gib`).
- Add comments only where they explain *why*, or where a beginner would need help.
- Preserve existing working code.
- When fixing a bug, make the smallest change that fixes the root cause.

## 5. Beginner-Friendly Rule

First-year students will read and maintain this code. Therefore:

- No clever one-liners, obscure syntax, metaprogramming, or advanced design patterns.
- No service/repository/dependency-injection layers.
- Use plain `function` declarations, `async/await` with `fetch`, and plain SQL.
- Keep the file organization exactly as in the project structure (section 22).
- Briefly explain important decisions in your final report so the team learns from them.

## 6. Before Every Development Task

You MUST, in order:

1. Read `antigravity.md`.
2. Read the relevant sections of `spec.md`.
3. Inspect the existing code.
4. Understand the existing architecture.
5. Identify dependencies (files, endpoints, tables, pages affected).
6. Avoid breaking existing features.
7. Plan the smallest safe change.
8. Implement the change.
9. Test the change.
10. Report what changed (see section 20).

## 7. Never Code Blindly

NEVER:

- overwrite working code without reading it first
- create duplicate files unnecessarily
- create duplicate APIs
- create conflicting database models or tables
- change the stack without permission
- remove functionality without justification
- invent undocumented requirements

## 8. UI/UX Rules

The UI must feel like a modern university app. Follow `spec.md` section 16 exactly.

**Use:** the CSS variables defined in `style.css` for all colors; consistent spacing; one card style; one primary button style; clear visual hierarchy; accessible contrast; responsive, mobile-first layout; status colors **Open = red, In Progress = amber, Resolved = green** (always with a text label).

**Avoid:** heavy gradients, long animations, glassmorphism, clutter, inconsistent spacing, random one-off colors, decorative elements that do not help usability.

**Do not copy** any existing app's branding, logo, layout, or assets. CampusConnect has its own identity.

Insert user-provided text into the page with `textContent`, never `innerHTML`.

## 9. Backend Rules

Keep FastAPI simple and organized (files listed in section 22). You must:

- validate every input (Pydantic models + allowed-value checks)
- return correct HTTP status codes and clear `detail` messages
- handle errors (`HTTPException` for expected errors; generic `500` message for unexpected ones, real error logged on the server only)
- avoid duplicated logic
- keep database code easy to read

## 10. Database Rules

SQLite is the only persistence layer. You must:

- keep the two tables `users` and `issues` as defined in `spec.md` section 11
- preserve the `issues.reporter_id → users.id` relationship and enable `PRAGMA foreign_keys = ON`
- never make destructive schema changes (drop table, drop column, delete data) unless explicitly requested
- not add tables without a documented reason
- avoid storing duplicate data
- always use parameterized queries (`?` placeholders), never string-built SQL
- keep queries short and understandable

## 11. API Rules

Before creating an endpoint:

1. Check `spec.md` section 12 and the existing routes for a similar endpoint.
2. Reuse the existing conventions: JSON bodies, `{"detail": "..."}` errors, `Authorization: Bearer <token>`.
3. Keep naming consistent (plural resource `issues`, lowercase, no verbs in paths except where already defined).
4. Document any new endpoint in `spec.md` and `README.md` in the same change.

## 12. Authentication Rules

Keep authentication appropriate for the project scope (see `spec.md` section 15).

- Never expose passwords or password hashes in responses or logs.
- Never hard-code secrets. Never put credentials in frontend code.
- Hash passwords with the standard library (PBKDF2 via `hashlib`); no plain-text passwords.
- `reporter_id` always comes from the logged-in user's token, never from the request body.
- If a security decision is needed that the specification does not define, **explain the options and ask before adding significant complexity.**

## 13. Git Rules

- Never assume work belongs directly on `main`. `main` must always run.
- Use feature branches: `feature/<short-name>` or `fix/<short-name>`.
- Workflow: **branch → commit → push → pull request → review → merge**. (The PDF requires Branch → Commit → Push → Pull Request → Merge; Review is our team practice.)
- Write clear commit messages that describe the change (e.g. `Add status update endpoint`).
- Do not commit `venv/`, `__pycache__/`, `*.db`, or `.env`.
- Each team member must have their own visible contributions. Do not bundle another member's task into your change unless asked.

## 14. Change Management

Prefer: **small change → test → inspect → continue.**
Avoid: **large rewrite → hope it works.**

Do not reformat or restructure files you are not otherwise changing.

## 15. Debugging Rules

When an error occurs:

1. Reproduce it.
2. Identify the root cause.
3. Explain the root cause in plain language.
4. Make the smallest appropriate fix.
5. Test again.
6. Check for regressions in related features.

Never patch symptoms blindly or hide an error to make it disappear.

## 16. Dependency Rules

Do not add packages unless necessary. Before adding one:

- verify the existing stack (standard library, FastAPI, browser APIs) cannot solve the problem
- explain why it is needed
- get team approval
- add it to `backend/requirements.txt` and update the README

## 17. Scope Protection

Protect the 4-day timeline. If a requested feature is unnecessary, risky, too complex, or outside the MVP (`spec.md` section 22), **flag it explicitly before implementing it** and suggest the simplest alternative. Optional features come only after every MVP feature works and is merged. Out-of-scope items (`spec.md` section 3) must not be built.

## 18. Documentation Rules

When functionality changes:

- update `README.md` if setup, features, structure, or endpoints change
- update the API section of `spec.md` if an endpoint changes
- update `spec.md` if the architecture, database, or pages change
- keep all four documents consistent with each other (names of pages, endpoints, tables, statuses, categories)

## 19. Testing Rules

Every meaningful feature must be tested. At minimum test:

- the **happy path**
- **invalid input** (too short, wrong type, unknown category/status)
- **missing input** (empty fields, missing token)
- **backend failure** (server stopped, `404`, `500` handling)
- **database interaction** (data saved, visible after refresh, survives server restart)

Use the FastAPI docs page at `/docs` for API checks and the browser for UI checks. Report exactly what you tested. If you could not test something, say so.

## 20. Final Response Format

After each development task, report:

### Changed
Which files were changed or created.

### Why
Why the changes were necessary.

### Implementation
What was implemented, including important decisions explained simply.

### Testing
What was tested and the results.

### Remaining
Known issues or things not done.

### Next Step
The safest next development step.

## 21. Absolute Rules

**NEVER:**
- invent requirements
- change the technology stack without permission
- over-engineer
- delete working features unnecessarily
- create duplicate systems
- ignore existing architecture
- hide errors
- claim something works without testing it

**ALWAYS:**
- inspect first
- plan first
- make minimal changes
- test
- preserve consistency
- prioritize the MVP

---

## 22. Project Quick Reference

Use these exact names everywhere (code, docs, UI).

### Project structure

```
campusconnect/
├── backend/
│   ├── main.py              # app creation, startup, serves frontend
│   ├── database.py          # SQLite connection + table creation
│   ├── schemas.py           # Pydantic models, CATEGORIES, STATUSES
│   ├── auth.py              # password hashing, tokens, get_current_user
│   ├── routes_auth.py       # /auth endpoints
│   ├── routes_issues.py     # /categories and /issues endpoints
│   └── requirements.txt     # fastapi, uvicorn
├── frontend/
│   ├── index.html           # Login / Register
│   ├── dashboard.html       # Dashboard
│   ├── create-issue.html    # Create Issue
│   ├── issue.html           # Issue Details (?id=<issue id>)
│   ├── profile.html         # Profile
│   ├── css/style.css
│   └── js/
│       ├── api.js           # fetch wrapper + token helpers
│       ├── ui.js            # nav bar, badges, messages, dates
│       ├── auth.js
│       ├── dashboard.js
│       ├── create-issue.js
│       ├── issue.js
│       └── profile.js
├── spec.md
├── brief.md
├── antigravity.md
├── README.md
└── .gitignore
```

### Fixed values

- **Categories:** `Classroom`, `Campus`, `Lost & Found`, `General`
- **Statuses:** `Open`, `In Progress`, `Resolved`
- **Tables:** `users`, `issues`
- **Endpoints:** `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `GET /categories`, `GET /issues`, `POST /issues`, `GET /issues/{id}`, `PUT /issues/{id}/status`
- **Pages:** Login / Register, Dashboard, Create Issue, Issue Details, Profile
- **Token storage key (frontend):** `campusconnect_token` in `localStorage`
- **Run command:** from `backend/`: `uvicorn main:app --reload`, then open `http://127.0.0.1:8000`

### Open team decisions (ask before changing)

- Who may update status (currently: any logged-in student)
- Whether status changes must go forward only (currently: any change allowed)
