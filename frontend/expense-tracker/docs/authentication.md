# Authentication operations

The frontend is deployed separately from the Spring Boot/MongoDB API. Set `VITE_API_URL` to the API origin in the frontend build environment.

## Backend settings

- Runtime: Java 21 / Spring Boot 4.1.1.
- Root directory: `backend`.
- Build: `./mvnw verify`; start: `java -jar target/expense-tracker-api-1.0.0.jar`.
- Container deployment: use `backend/Dockerfile` with build context `backend`.
- Health check: `/api/health`.
- Required environment: `MONGO_URI`, `JWT_SECRET`; configure `FRONTEND_URL` for the exact frontend origin.

Keep the existing database and signing secret during migration. Existing bcryptjs passwords and Express JWTs remain supported. New JWTs expire after seven days by default (`JWT_TTL`).

`GET /api/health` returns HTTP 200 with `{"status":"ok"}` when MongoDB responds, or HTTP 503 with `{"status":"starting"}` when unavailable. Database failures return sanitized JSON with HTTP 503. Missing required configuration prevents startup. Index creation also requires a reachable database at startup.

## Request behavior

- Capture fields before disabling the form. Trim and lowercase email addresses; preserve passwords exactly.
- Show slow-request feedback after eight seconds and stop waiting after one minute.
- Never automatically retry signup: a timed-out request may already have created an account.
- Duplicate accounts return 409, incorrect credentials return 401, and invalid payloads return 400.
- Require a nonempty session token before entering the dashboard.
- Send tokens in the Authorization header, not cookies.

## Verification

Run `./mvnw verify` in `backend`, then `npm test` and `npm run build` in `frontend/expense-tracker`. Backend integration tests use a disposable MongoDB-compatible server and an Express-generated password/JWT fixture; they do not access production data.

See [backend deployment and migration notes](../../../backend/README.md) before changing the Render runtime. Existing production hosting is not automatically changed by a repository migration.
