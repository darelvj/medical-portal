# Medical Portal — React frontend

A demo medical imaging workflow built with React, TypeScript, Vite, Tailwind CSS, and TanStack Query. It connects to the companion Flask API in the sibling `python_server` project. All seeded patients and studies are fictional. This is a learning project, **not** a clinical system. link to python repo: https://github.com/darelvj/medical-portal-api.git

## What it demonstrates

- Cookie-based sign-in and logout, with session restoration through `/api/auth/me`. The browser never reads or stores the JWT.
- Tenant-scoped patient search, filtering, pagination, study details, and patient editing.
- Role-based administration, user management, scan assignment, radiologist worklists, and an admin-only study audit timeline.
- Structured drafts, reusable report templates, second review, QA, and signing workflow.
- Scan scheduling and calendar, plus turnaround-time (TAT) metrics and an admin MIS view.
- Light/dark preference after sign-in; the login page keeps its own fixed design.

The API is the source of truth for authorization. Hiding a button in React is not a security boundary.

## Local setup

Prerequisites: a recent Node.js/npm installation, the Flask backend running locally, and PostgreSQL configured for that backend. See the backend's `README.md` for database initialization, migrations, and seed data.

From this folder:

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`. The development server proxies `/api` to the Flask address configured by `BACKEND_URL` (default `http://127.0.0.1:5000`). Keep the Flask server running separately on port 5000. The frontend calls relative `/api` paths with `credentials: 'include'` so the HttpOnly authentication cookie works on one browser origin. Do not put a JWT or password in the frontend environment file.

To try the demo, sign in with an account seeded by the backend, such as `admin@example.test` or `avery.stone@example.test`, using the backend's local demo password. These credentials are for fictional local data only.

## Project structure

```text
src/App.tsx                  Main navigation and application state
src/lib/api.ts               Typed API calls and response handling
src/features/auth/           Login
src/features/admin/          User management, templates, TAT/MIS
src/features/patients/       Patient views, worklist, calendar, report editor
src/features/dashboard/      Dashboard summary
vite.config.ts               Development API proxy
```

## Checks

```bash
npm run lint
npm run build
```

The Flask project has its own `pytest -q` suite. For a full smoke test, start both servers, sign in as admin, open patient records, then sign in as a radiologist and check the worklist and report editor.
