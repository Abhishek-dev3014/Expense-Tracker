#!/usr/bin/env bash
# AI uses a custom image; API uses Catalyst-managed Java 21.
# Runtime secrets remain in Catalyst; never bake them into images or logs.
set -euo pipefail
: "${CATALYST_TOKEN:?Set the CATALYST_TOKEN GitHub secret}"
: "${CATALYST_PROJECT_ID:?Set the FinTrack Catalyst project ID}"
: "${DOCKERHUB_USERNAME:?Set the Docker Hub username}"
: "${GITHUB_SHA:?Set the full Git commit SHA to deploy}"
: "${AI_URL:?Set the existing AI Development URL}"
: "${API_URL:?Set the existing API Development URL}"
[[ "$GITHUB_SHA" =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid Git SHA'; exit 1; }
for url in "$AI_URL" "$API_URL"; do
  [[ "$url" == https://* ]] || { echo 'Health URLs must use HTTPS'; exit 1; }
done
args=(--project "$CATALYST_PROJECT_ID" --dc "${CATALYST_DC:-in}")
if [[ -n "${CATALYST_ORG_ID:-}" ]]; then args+=(--org "$CATALYST_ORG_ID"); fi
repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
api_jar="${API_JAR:-$repo_root/backend/target/expense-tracker-api-1.0.0.jar}"
[[ -f "$api_jar" ]] || { echo 'Build the backend JAR before deployment'; exit 1; }
# An isolated project root keeps unrelated resources out of the deployment.
project_dir=$(mktemp -d)
trap 'rm -rf "$project_dir"' EXIT
printf '{}\n' > "$project_dir/catalyst.json"
mkdir "$project_dir/api"
cp "$api_jar" "$project_dir/api/app.jar"
cd "$project_dir"
for service in ai api; do
  if [[ "$service" == ai ]]; then
    image="$DOCKERHUB_USERNAME/fintrack-ai:sha-$GITHUB_SHA"
    docker image inspect "$image" > /dev/null
    catalyst deploy appsail --name fintrack-ai \
      --source "docker://$image" --port 9000 "${args[@]}" 2>&1 | tee deploy.log
  else
    # The same JAR succeeds on managed Java 21 while the custom image fails
    # before HTTP startup. Keep the existing app URL, secrets and memory.
    catalyst deploy appsail --name fintrack-api \
      --build-path "$project_dir/api" --stack java21 --platform javase \
      --command 'java -XX:TieredStopAtLevel=1 -XX:MaxRAMPercentage=60.0 -XX:+ExitOnOutOfMemoryError -jar app.jar --server.port=9000 --server.address=0.0.0.0' \
      "${args[@]}" 2>&1 | tee deploy.log
  fi
  # This CLI can report a failed target without a failing process exit code.
  grep -q 'Catalyst AppSail Deploy completed successfully' deploy.log || {
    echo "Catalyst did not confirm deployment of fintrack-$service"; exit 1;
  }
  if [[ "$service" == ai ]]; then health="${AI_URL%/}/health";
  else health="${API_URL%/}/api/health"; fi
  curl --fail --silent --show-error --retry 18 --retry-delay 10 \
    --retry-all-errors --connect-timeout 10 --max-time 20 "$health" > /dev/null
  echo "fintrack-$service is healthy"
done
