# Spring Boot backend

## Architecture

This backend is a **modular monolith organized by business feature**. One deployable application contains clearly owned features; related code stays together as the codebase grows.

```text
backend/
├── .mvn/wrapper/             Maven wrapper configuration
├── docs/                    Architecture decisions and contributor guidance
├── src/
│   ├── main/
│   │   ├── java/com/expensetracker/
│   │   │   ├── ExpenseTrackerApplication.java
│   │   │   ├── config/      Application settings and Spring wiring
│   │   │   ├── security/    JWT authentication
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── user/
│   │   │   │   ├── transaction/
│   │   │   │   ├── category/
│   │   │   │   ├── budget/
│   │   │   │   ├── goal/
│   │   │   │   ├── recurring/
│   │   │   │   ├── split/
│   │   │   │   ├── analytics/
│   │   │   │   └── gamification/
│   │   │   ├── integrations/ml/  External prediction client
│   │   │   ├── platform/health/  Readiness checks
│   │   │   └── shared/           Errors, persistence base, dates, email normalization
│   │   └── resources/application.yml
│   └── test/
│       ├── java/com/expensetracker/
│       │   ├── architecture/    Enforced dependency rules
│       │   ├── integration/     API, security, and MongoDB compatibility tests
│       │   └── …                Unit tests mirror production packages
│       └── resources/           Nonproduction fixtures
├── .env.example
├── .dockerignore
├── Dockerfile
├── mvnw / mvnw.cmd
├── pom.xml
└── README.md
```

Each feature contains only the layers it needs:

```text
features/transaction/
├── api/             HTTP controller
├── application/     Write use cases and transaction read service
├── domain/          Transaction documents and money summaries
├── dto/             Individual validated requests and response contracts
└── infrastructure/  MongoDB repositories and queries
```

Controllers call application services. Services own business rules and use their feature's infrastructure. Cross-feature collaboration goes through application services; a feature cannot access another feature's repositories. Features may exchange domain objects and DTOs, but must not form dependency cycles. Architecture tests enforce these rules during `./mvnw verify`.

Existing URLs and JSON contracts are preserved. Money uses `BigDecimal` and Decimal128; documents retain MongoDB ObjectIds and existing collection names. Stable `@TypeAlias` values prevent future Java package changes from becoming persistent schema changes. Tests cover both legacy Mongoose documents and documents containing the previous Java `_class` names.

The backend stays on MongoDB, with React and the optional Python predictor as separate components. See [architecture and contribution rules](docs/architecture.md) for ownership, dependency direction, and where to add new code.

## Configuration

The application imports a local `.env` as a Java properties file when started from `backend`. Use plain `KEY=value` lines without shell `export` or surrounding quotes. Deployment environment variables take precedence. No credentials are checked in.

| Variable | Purpose | Default |
| --- | --- | --- |
| `MONGO_URI` | Existing MongoDB connection string, including database name | Required |
| `JWT_SECRET` | Existing HS256 signing secret | Required |
| `PORT` | HTTP port | `5001` |
| `FRONTEND_URL` | Exact allowed frontend origin; comma-separated origins supported | `http://localhost:5173` |
| `JWT_TTL` | Lifetime for newly issued tokens | `7d` |
| `APP_TIME_ZONE` | Calendar months, streaks, and recurrence calculations | `Asia/Kolkata` |
| `ML_SERVICE_URL` | Python predictor origin or `/predict` URL | `http://localhost:8000` |
| `ML_TIMEOUT` | Bounded category-prediction timeout | `5s` |
| `SPRING_PROFILES_ACTIVE` | Use `prod` for deployment with explicit `FRONTEND_URL` origins | Unset locally |

Localhost/127.0.0.1 Vite origins on ports 5173/5174 are supported. Production CORS uses exact origins, not wildcard Vercel domains or prefix matching. CSRF is disabled for the stateless Authorization-header API; it does not use cookie authentication. All nonpublic endpoints require a bearer token. Actuator environment/configuration endpoints are not exposed.

## API compatibility

Base URL: `http://localhost:5001`. Authentication returns `{ "token": "..." }`; errors retain a human-readable `message`. Validation errors also include field errors. All IDs below are MongoDB ObjectId strings.

| Area | Endpoints |
| --- | --- |
| Readiness | `GET /api/health`, `GET /actuator/health` |
| Authentication | `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/profile`, `POST /api/auth/complete-tutorial` |
| Categories | `GET /api/categories?type=expense`, `POST /api/categories` |
| Transactions | `GET /api/transactions`, `POST /api/income`, `POST /api/expense`, `DELETE /api/transactions/{id}` |
| Import | `POST /api/transactions/batch`; `/api/batch` retained as an alias |
| Overview | `GET /api/dashboard?page=1` |
| Budget | `GET /api/budget`, `POST /api/budget` |
| Insights | `GET /api/insights` |
| Reports | `GET /api/reports/monthly?month=1&year=2026` |
| Goals | `GET/POST /api/goals`, `PUT/DELETE /api/goals/{id}` |
| Recurring | `GET/POST /api/recurring`, `PUT/DELETE /api/recurring/{id}`, `POST /api/recurring/process` |
| Achievements | `GET /api/gamification/status`, `POST /api/gamification/check-streak`, `POST /api/gamification/sync-badges` |
| Splits | `GET /api/splits/summary`, `POST /api/splits/send-request`, `PATCH /api/splits/respond-request/{id}`, `PATCH /api/splits/settle-social/{id}`, `POST /api/splits/split/{id}`, `POST /api/splits/settle/{txId}/{name}` |

Transaction queries accept `page`, `limit` (1–100), literal `search`, exact `category`, `type`, `startDate`, and `endDate`. Date-only end filters include the whole UTC day; report and budget months use `APP_TIME_ZONE` with an exclusive next-month boundary. Import validates the entire payload before inserting and limits batches to 1,000 items. Posted amounts must be positive, with at most two decimal places; expenses are stored as negative amounts.

Recurring processing retains the existing behavior of processing one due occurrence per schedule per request. A deterministic transaction ObjectId prevents duplicate inserts across concurrent processors and crash/retry scenarios. An atomic compare-and-set advances the occurrence. Paused items are excluded. Month/year progression clamps to valid calendar dates. It is request-driven, as before; no unsolicited scheduler is added.

## Existing-data migration and deployment

See the [Render production runbook](docs/production-deployment.md) for exact
service settings, the production profile, cutover, and read-only smoke checks.
The `prod` profile allows only explicitly configured `FRONTEND_URL` origins,
excluding the default local development origins.

1. Back up the existing database and validate the migration against a staging copy. No automatic data rewrite or remote deployment is performed by this code change.
2. Keep `MONGO_URI` (including its database name) and `JWT_SECRET` unchanged. Existing bcryptjs hashes and Express HS256 tokens with an `id` claim remain accepted. New tokens expire according to `JWT_TTL`; old tokens without `exp` remain valid as before. Rotating the secret invalidates all sessions.
3. Review duplicate budgets for the same `(user, month)` before first startup. The new unique budget index deliberately fails rather than silently deleting or merging conflicting data. Existing category and email unique indexes are retained.
4. Run `./mvnw verify`, then build the provided Dockerfile or run `./mvnw package` and `java -jar target/expense-tracker-api-1.0.0.jar`.
5. On Render, switch the existing backend service from Node to a Docker service using `backend/Dockerfile` and build context `backend`; preserve environment variables and use `/api/health` for readiness. If the service requires replacement, set the frontend's `VITE_API_URL` to its new origin and rebuild the frontend. These hosting changes must be performed during deployment.
6. Stop the Express process before starting Spring Boot against the live database, particularly to avoid two recurring processors writing the same schedule. Verify readiness, existing-user login, dashboard totals, imports, and reports before directing users to the new service.

The previous Node implementation is available in Git history. Rollback requires stopping Spring Boot first and reviewing new Decimal128 records against the older Mongoose version in staging; do not blindly run both writers concurrently.

## Verification scope

`./mvnw verify` checks Java formatting and runs full Spring HTTP/security/repository integration tests on a disposable MongoDB-compatible server. Coverage includes feature dependency cycles, repository encapsulation, layering, package-move data compatibility, Express password/JWT compatibility, BSON ObjectId and numeric mappings, account isolation, input validation, transaction filtering, month boundaries, imports, category normalization, budgets, goals, recurring concurrency and crash recovery, split authorization, streaks, badges, CORS, readiness, and ML fallback.

CI builds/tests the Java backend and React frontend independently. Docker packaging and production MongoDB/Render behavior must additionally be verified in the deployment environment.

Design references: [Spring Boot](https://docs.spring.io/spring-boot/), [Spring Security](https://docs.spring.io/spring-security/reference/), and [Spring Data MongoDB](https://docs.spring.io/spring-data/mongodb/reference/).

Run `./mvnw spotless:apply` to format Java sources before committing. The build checks the same pinned Google Java Format style in CI.

`node_modules` and the old Express source/test folders have been removed. Maven creates `target/` only when compiling or testing; it is ignored by Git and can be removed with `./mvnw clean`. Keep `.mvn/`, both wrapper scripts, and your local `.env`.
