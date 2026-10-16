# Expense Tracker

A React application backed by a Java 21 / Spring Boot 4.1.1 REST API and MongoDB. The optional Python/FastAPI service supplies expense-category predictions.

## Start locally

Prerequisites: JDK 21+, Node.js 22+, and a reachable MongoDB instance. Maven is downloaded automatically by the checked-in Maven wrapper; no global Maven installation is needed.

1. Configure `backend/.env` using `backend/.env.example` as a reference. **For an existing installation, keep the existing file, `MONGO_URI`, and `JWT_SECRET`.** For a new installation, copy the example and replace its placeholder signing secret with a long random secret.
2. Start the API:
   ```sh
   cd backend
   ./mvnw spring-boot:run
   ```
   On Windows use `mvnw.cmd spring-boot:run`. The server reads `.env` from its working directory and listens on port 5001 by default.
3. In a second terminal, start the frontend:
   ```sh
   cd frontend/expense-tracker
   npm ci
   npm run dev
   ```
   `VITE_API_URL` defaults to `http://localhost:5001` during local development. Production uses a same-origin `/api` proxy in `frontend/expense-tracker/vercel.json`, targeting the Catalyst Java API. Change that rewrite when moving the API; production builds intentionally ignore the legacy Render environment variable.
4. Check [API readiness](http://localhost:5001/api/health). A ready database produces `{"status":"ok"}`.

The Python ML service remains optional. Run `uvicorn app:app --host 127.0.0.1 --port 8000` from `ml-service` after installing its requirements in a Python virtual environment. When the predictor is unavailable, the API saves expenses under `General` within the configured timeout. User-selected categories never require ML. The response records `categoryStatus=unavailable` for an outage and `needs_review` for uncertain descriptions. CSV imports auto-detect blank expense categories in one batch. See the [ML model card](ml-service/MODEL_CARD.md) for evaluation, limitations and reproducible training.

## Tests and build

```sh
cd backend
./mvnw verify
java -jar target/expense-tracker-api-1.0.0.jar
```

The integration suite uses an isolated, in-memory MongoDB wire-protocol server. It does not load the project's `.env` or access production accounts. No Docker or local MongoDB installation is required for tests. Run against a staging MongoDB before production cutover; the test server is not a full MongoDB implementation.

```sh
cd frontend/expense-tracker
npm test
npm run build
```

An optional Docker development stack is provided: configure `backend/.env`, then run `docker compose up --build` from the repository root. This starts a **new local database** with a persistent volume; it does not connect to the remote database in `.env`. The frontend still runs separately. Do not remove the volume unless you intend to erase that local data.

## Backend structure

See [backend architecture and API documentation](backend/README.md) for package responsibilities, endpoint contracts, configuration, data compatibility, and deployment instructions.
