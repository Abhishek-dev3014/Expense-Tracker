#!/usr/bin/env bash
# CLI 1.28.0 deploys custom images to Development, with 2048 MB per service.
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
# An isolated project root keeps unrelated resources out of the deployment.
project_dir=$(mktemp -d)
trap 'rm -rf "$project_dir"' EXIT
printf '{}\n' > "$project_dir/catalyst.json"
cd "$project_dir"
for service in ai api; do
  image="$DOCKERHUB_USERNAME/fintrack-$service:sha-$GITHUB_SHA"
  # Use the same local image tested before publishing, with its immutable commit tag.
  docker image inspect "$image" > /dev/null
  catalyst deploy appsail --name "fintrack-$service" \
    --source "docker://$image" --port 9000 "${args[@]}" 2>&1 | tee deploy.log
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
