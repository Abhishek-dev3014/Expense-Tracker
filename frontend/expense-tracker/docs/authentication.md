# Authentication operations

The frontend is deployed separately from the Express/MongoDB API. Set `VITE_API_URL` to the API origin in Vercel's build environment. The inspected production build uses `https://expense-tracker-api-yv3f.onrender.com`.

## Backend settings

The existing backend service should use:

- Root directory: `backend`
- Build command: `npm ci`
- Start command: `npm start` (Node directly; nodemon is for `npm run dev`)
- Health check path: `/api/health`
- Environment: `MONGO_URI`, `JWT_SECRET`, and `FRONTEND_URL`

Keep the existing database and signing secret. Do not replace either for this deployment.

`GET /api/health` returns HTTP 200 with `{"status":"ok"}` when MongoDB is connected, or HTTP 503 with `{"status":"starting"}` during startup. Other API requests return a recoverable 503 while the database is unavailable. Missing required environment variables prevent startup with a descriptive server-side log.

## Request behavior

- Capture form fields before disabling the form. Trim and lowercase email addresses; preserve passwords exactly.
- Show slow-request feedback after eight seconds and stop waiting after one minute.
- Never automatically retry signup: a timed-out request may already have created an account.
- Return HTTP 409 for duplicate accounts, HTTP 401 for incorrect credentials, and JSON errors for database failures. Catch rejected promises explicitly in Express 4 handlers.
- Require a nonempty session token before entering the dashboard.

## Verification

Run `npm test` in both backend and frontend directories, plus the frontend build and lint checks. Tests cover normal authentication, invalid payloads, duplicate accounts, database outages, missing configuration, network failures, response-body stalls, cancellation, and timeouts.

Local browser verification uses test API responses and does not establish production availability. Check the Render service status and logs, confirm `/api/health` returns 200, and have the account owner sign in with their existing credentials.
