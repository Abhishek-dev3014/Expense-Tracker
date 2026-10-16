# FinTrack GitHub Actions → Catalyst

The AI service runs from `abhishek12439525/fintrack-ai` on Linux AMD64. The API
runs as a **Catalyst-managed Java 21 / Java SE** service. GitHub Actions verifies
the Java backend, builds both Docker images for portability, and checks both
containers over HTTP. It publishes the images and can deploy AI followed by the
backend JAR to **Development**.
Production promotion is a separate Catalyst console action.

## Verified backend recovery (17 October 2026)

The API's Alpine-based custom runtime returned Catalyst's pre-HTTP startup error,
even after a verified local container, explicit entrypoint, correct port and CLI
redeployment. Deploying the same JAR with Catalyst-managed Java 21 returned
HTTP 200 and `{"status":"ok"}` from `/api/health`, including an Atlas ping. This
isolates the remaining failure to the custom-runtime launch path; Catalyst's
empty logs do not identify the exact runtime incompatibility. Keep the API on
managed Java 21 rather than replacing this working deployment with its image.

There was also a reproducible image bug: `ENV PORT=5001` conflicted with AppSail's
port 9000 when no override was provided. The image now defaults to 9000, and CI
tests both that default and the injected Catalyst port against a local database.

## 1. Docker Hub and GitHub credentials

1. Sign in to [Docker Hub](https://hub.docker.com/) as `abhishek12439525`.
2. Create repositories `fintrack-ai` and `fintrack-api`. Choose private visibility
   if these application binaries and the trained model should remain private;
   check your Docker plan's private repository allowance before creating both.
3. In Docker account settings → Personal access tokens, create `fintrack-github`
   with repository Read & Write permission. No Delete permission is needed.
4. In the GitHub repository → Settings → Secrets and variables → Actions → Secrets,
   add `DOCKERHUB_TOKEN` with that token's value. Never paste tokens into chat.
5. In the **Variables** tab add `CATALYST_CI_ENABLED` = `true`. Leave
   `CATALYST_AUTO_DEPLOY` unset for the first image publication.
6. Push these workflow files to `feat/fintrack-modern-ui` (or merge them into
   `main`). Under Actions, watch **Docker images and Catalyst development**.
   It publishes `development` and `sha-<full-commit-sha>` tags for both images.
   A manual Run workflow also publishes; GitHub normally requires the workflow
   on the default branch before showing that button. The push trigger supports
   the current feature branch so initial setup does not require a merge.

The workflow only publishes from trusted push/manual runs, never pull requests.
It triggers on backend, AI, or deployment file changes; frontend-only work keeps
using the existing frontend CI. Both services are released together for now.

## 2. First deployment in the Catalyst console

Create a second Docker Hub token, `fintrack-catalyst`, with **Read-only** access.
In Catalyst's container registry integrations, add Docker Hub credentials with
username `abhishek12439525` and this read-only token. Then return to the AppSail
form shown in your screenshot and choose those credentials.

First deploy the AI service:

| Field | Value |
| --- | --- |
| AppSail name | `fintrack-ai` |
| Deployment type | Docker Image |
| Registry | Docker Hub |
| Image URL | `docker.io/abhishek12439525/fintrack-ai:development` |
| Port | `9000` |
| Memory | `512 MB` initially; see CLI limitation below |
| Startup command | Use image default |
| Catalyst authentication | Disabled; this service uses its own API key |
| Environment variable | `ML_SERVICE_API_KEY` = a random secret of at least 32 characters |

A key was generated locally at `deployment/catalyst/fintrack-ai.env`. Copy only the
value after `=` into Catalyst. This file is ignored by Git and excluded from both
Docker build contexts. Keep the same value for the backend below. Alternatively,
generate a new key with your password manager. The AI container refuses to start
without a key. Open the resulting Development URL plus `/health`; it should return
`{"status":"ok","service":"fintrack-ai"}`.

The existing API service keeps its URL and environment variables. Deploy its
compiled JAR as a managed runtime (the script in section 3 does this automatically):

| Field | Value |
| --- | --- |
| AppSail name | `fintrack-api` |
| Deployment type | Catalyst-Managed Runtime |
| Stack / platform | Java 21 / Java SE |
| Build file | Backend JAR, packaged as `app.jar` |
| Port | `9000` |
| Memory | `1024 MB` initially; see CLI limitation below |
| Startup command | `java -XX:TieredStopAtLevel=1 -XX:MaxRAMPercentage=60.0 -XX:+ExitOnOutOfMemoryError -jar app.jar --server.port=9000 --server.address=0.0.0.0` |
| Catalyst authentication | Disabled; the backend uses its existing JWT authentication |

Configure these API environment variables in Catalyst before deploying:

| Variable | Value |
| --- | --- |
| `SPRING_PROFILES_ACTIVE` | `prod` (strict CORS configuration, also in Development) |
| `PORT` | `9000` (Catalyst's injected listen port takes precedence) |
| `MONGO_URI` | Your existing MongoDB connection string |
| `JWT_SECRET` | Your existing JWT secret, preserving existing sessions |
| `FRONTEND_URL` | Exact frontend origin, e.g. `https://your-site.example`, no trailing slash |
| `ML_SERVICE_URL` | AI Development base URL, no `/predict` suffix required |
| `ML_SERVICE_API_KEY` | Exactly the same secret as the AI service |
| `APP_TIME_ZONE` | `Asia/Kolkata` |
| `ML_TIMEOUT` | `15s` initially, to allow some cold-start time; monitor and adjust |

The API image defaults to `PORT=9000`, matching its exposed port and the AppSail
setting. `X_ZOHO_CATALYST_LISTEN_PORT` overrides that default when injected. Do not
rely on the console's routing-port setting to rewrite the image's `PORT` variable.
CI boots the actual API container against MongoDB with no port variables and with
a Catalyst port override, then checks `/api/health` before publishing.

The portable API image uses `/app/docker-entrypoint.sh` and a public TCP listener.
The active managed Java deployment runs `app.jar` directly with the command above;
it does not include that container script or require `socat`.

Ensure your MongoDB network rules permit the Catalyst service to connect. Test
API `/api/health`, which checks MongoDB readiness. The backend sends `X-API-Key`
when calling the predictor. The frontend never receives this service key.

## 3. Enable automatic Development deployment

Install the pinned CLI locally and generate a CI token in your own terminal:

```sh
npm install --global zcatalyst-cli@1.28.0
catalyst token:generate --dc in
```

Complete the displayed browser verification. Save the resulting token directly
as GitHub Actions secret `CATALYST_TOKEN`. Do not enable verbose CLI logging;
it can expose authentication data.

Add these GitHub Actions **Variables**:

| Name | Value |
| --- | --- |
| `CATALYST_PROJECT_ID` | The ID of **FinTrack**, from Catalyst project settings |
| `CATALYST_ORG_ID` | Organization ID if FinTrack is not in your default organization; otherwise omit |
| `CATALYST_AI_URL` | AI Development base URL |
| `CATALYST_API_URL` | API Development base URL |
| `CATALYST_CI_ENABLED` | `true` |
| `CATALYST_AUTO_DEPLOY` | `true`, after both services are healthy and the memory allocation below is acceptable |

**CLI memory limitation:** inspection of `zcatalyst-cli@1.28.0` shows that its
standalone custom-image deployment sends **2048 MB for the AI service on every deploy**.
The managed API deployment preserves its existing allocation (currently 1024 MB).
The AI allocation affects
usage charges. You may lower memory manually afterward, but the next CI deployment
will reset it again. Leave `CATALYST_AUTO_DEPLOY` unset if you prefer publishing
images automatically and redeploying in the console with your chosen memory.
The regular CLI deployment route also hardcodes Catalyst authentication on for
custom images in this version, so this workflow deliberately uses standalone
image deployment, retaining the apps' own authentication instead.

CI sends the tested AI image using Catalyst's Docker image protocol and the
verified backend JAR using its Java 21 runtime. Docker Hub retains both images
for portability; use the managed Java JAR for API rollback. Merely pushing a tag
does **not** redeploy Catalyst. The CLI step is
what updates the running Development services. Runtime credentials stay in the
Catalyst console; deployment does not send replacements for them.

The script checks both CLI success output and HTTP readiness; CLI 1.28.0 can log
an unsuccessful target without returning a nonzero process exit code. It stops
before API deployment if AI deployment or health fails. A two-service release is
not atomic: if API deployment fails, AI may already be updated. Review logs and
roll back using the prior working commit tags. HTTP readiness checks do not prove
a production migration or full browser flow; test login, add expense, and AI
categorization before promoting in Catalyst.

## Local builds and verification

```sh
docker build --platform linux/amd64 -t fintrack-ai:test ml-service
docker run --rm --network none -v "$PWD/ml-service/tests:/tests:ro" \
  -e FINTRACK_BUNDLE=/app fintrack-ai:test \
  python3 -m unittest discover -s /tests -v
(cd backend && ./mvnw -B -ntp verify)
docker build --platform linux/amd64 -t fintrack-api:test backend
```

Images contain application code, dependencies, and the existing model artifacts;
they do not contain `.env`, database credentials, or the training dataset.

## References

- [Catalyst Docker deployment](https://docs.catalyst.zoho.com/en/serverless/help/appsail/custom-runtimes/deploy-from-console/)
- [Catalyst CLI deployment](https://docs.catalyst.zoho.com/en/cli/v1/deploy-resources/deploy-appsail/)
- [Catalyst CI token](https://docs.catalyst.zoho.com/en/cli/v1/working-with-tokens/generate-token/)
- [Docker access tokens](https://docs.docker.com/security/access-tokens/personal-access-tokens/)
