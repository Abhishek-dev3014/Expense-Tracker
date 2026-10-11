# Production deployment on Render

Upgrade the existing `expense-tracker-api-yv3f.onrender.com` service in place to
preserve its URL and stored environment variables. Source repository:
`Abhishek-dev3014/Expense-Tracker` (the former `Abhishek-dev69` URL redirects
here). Java uses Render's Docker runtime.

## Service settings

| Setting | Value |
| --- | --- |
| Runtime | Docker |
| Root directory | `backend` |
| Dockerfile path | `./Dockerfile` (relative to root directory) |
| Docker build context | `.` (relative to root directory) |
| Docker command | Leave empty; use the image entrypoint |
| Health check path | `/api/health` |
| Production profile | `SPRING_PROFILES_ACTIVE=prod` |
| Frontend origins | `FRONTEND_URL=https://expense-tracker-beryl-delta.vercel.app` |
| Calendar timezone | `APP_TIME_ZONE=Asia/Kolkata` |

Retain the existing `MONGO_URI`, including its database name, and `JWT_SECRET`.
Use exact frontend origins without trailing slashes, paths, or wildcards;
multiple origins can be comma-separated. Production excludes development
localhost origins. Render supplies `PORT`. Keep an existing remote
`ML_SERVICE_URL` if the predictor is deployed; otherwise predictions fall back
to `General`.

The image runs as a non-root user. Its heap is limited to 60% of container memory
to leave room for native allocations and threads. The JVM exits on out-of-memory
errors so the host can restart it. Confirm memory usage under actual traffic
before choosing a larger plan; this change does not purchase one.

## Cutover

1. Run `./mvnw verify`, validate against a staging copy of the production database,
   and confirm a current backup exists. Automated tests use a disposable
   database and cannot establish the state of the live database.
2. Check budgets for duplicate `(user, month)` pairs. The required unique index
   rejects duplicates; resolve them deliberately rather than deleting data
   automatically. Existing Mongoose `email_1` and `toEmail_1` indexes are reused.
3. Push tested code to a separate deployment branch. Do not push Java-only code
   to a branch still auto-deploying with Node commands.
4. Set the variables and health check above on the existing Render service.
   Preserve its database credentials, instance plan, region, and URL.
5. Open **Settings → Build → Source → Edit**, select the same repository, the
   deployment branch, and **Docker**. Confirm the root/context settings and
   deploy. See [runtime migration](https://render.com/docs/native-runtimes) and
   [monorepo path settings](https://render.com/docs/monorepo-support).
6. Schedule cutover during a quiet period and avoid writes until the old Express
   instance retires. Startup and health checks do not create transactions. Do
   not invoke recurring processing concurrently across the two runtimes.
7. Wait for **Live**, confirm Spring startup and database connectivity in the
   logs, and verify the deployed commit matches the tested commit.
8. Run these read-only checks from the repository root:

   ```sh
   python3 backend/scripts/smoke-test.py \
     https://expense-tracker-api-yv3f.onrender.com \
     https://expense-tracker-beryl-delta.vercel.app
   ```

9. Verify existing-user sign-in, dashboard totals, and reports through the live
   frontend. Its build-time `VITE_API_URL` must match the backend origin above.
   Preserving the backend URL avoids changing the frontend API setting.
10. Keep the deployment branch configured for future releases, or merge into
    `main` after verification and switch Render's source branch to `main`.

The smoke script checks readiness, authentication boundaries, and exact CORS
origins without credentials or database writes. It expects the production
profile and deliberately rejects localhost access.

## Recovery

For startup failures, inspect logs for missing variables, Atlas network rules,
invalid credentials, or conflicting indexes. Never log connection strings or
loosen Atlas access globally to work around connectivity errors.

Render retains the previous healthy instance when a replacement fails health
checks. After Spring has accepted writes, stop writes and test compatibility
before rollback: new money values are BSON Decimal128, whereas the former API
used JavaScript numbers. A blind rollback could mishandle new records. Restoring
a backup requires explicit agreement about loss of newer data.

References: [Docker](https://render.com/docs/docker),
[health checks](https://render.com/docs/health-checks),
[rollbacks](https://render.com/docs/rollbacks).
