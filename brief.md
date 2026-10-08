# CampusConnect — Product Brief

## One-Line Description

CampusConnect is a simple web app where students report campus issues, see what others have reported, and track each issue from **Open** to **Resolved**.

## Problem

Campus problems — a broken fan, no Wi-Fi, a lost ID card — are usually reported informally and are easy to lose track of. Students cannot easily see what has already been reported or whether anyone is handling it.

## Solution

One simple website where a logged-in student can submit an issue with a title, description, and category, browse all submitted issues on a dashboard, open any issue for details, and update its status.

## Target Users

College students. There are no admin or staff roles in the project statement, so none are built.

## Core User Journey

```
Open website → Register / Login → Dashboard → Create New Issue
→ Title + Description → Select Category → Submit
→ View Issue Details → Check / Update Status (Open → In Progress → Resolved)
```

## Core Features

- Register, log in, and log out
- Create an issue (title, description, category)
- Dashboard listing all submitted issues
- Issue Details page (title, description, category, status, who submitted it and when)
- Update status: Open, In Progress, Resolved
- Simple Profile page

## Issue Categories

Four categories, taken from the headings in the project statement:

| Category | Examples from the statement (examples only) |
|----------|---------------------------------------------|
| Classroom | Fan not working, light not working, projector problem |
| Campus | Wi-Fi not working, cleanliness issue, water cooler not working |
| Lost & Found | Lost ID card, found a water bottle, lost a notebook |
| General | Library-related issue, lab equipment issue, other campus problem |

## Issue Statuses

**Open** → **In Progress** → **Resolved**

## Product Experience

Opening CampusConnect should feel like a small, friendly university utility app: log in, see the issue list at once, tap "New Issue", fill three fields, and you are done. Everything is reachable in one or two taps from the Dashboard, and works well on a phone.

## Design Direction

Modern campus utility style with its own identity: deep university red as the main color, soft off-white background, white rounded cards, dark charcoal text. Status badges use red (Open), amber (In Progress), and green (Resolved), always with a text label. No heavy gradients, no complex animation — clarity first.

## Technology

HTML · CSS · JavaScript (frontend) · Python · FastAPI (backend) · SQLite (database) · Git · GitHub (version control)

No other major technologies.

## MVP

These must work before anything else is added:

1. Register / log in / log out
2. Create an issue with title, description, and category
3. Dashboard list of issues
4. Issue Details page
5. Status update that persists
6. Profile page
7. Data stored in SQLite
8. README plus visible GitHub contributions from all 4 members through branches and pull requests

## Success Criteria

- A new student can register, report an issue, and see it on the Dashboard in under a minute.
- Changing a status is saved and still shown after refreshing the page.
- The project runs on a fresh clone by following the README.
- Every team member has meaningful commits and PRs on GitHub.
- The team can explain how the frontend, backend, and database work together.

*Working properly matters more than building something big.*
