# Optional ZIP deployment for FinTrack AI

The preferred Docker and GitHub Actions setup is in [the deployment guide](../ops/catalyst/README.md). This page documents the alternative managed-runtime ZIP only.

Use the FinTrack project's Development environment first.

## Console form

- AppSail name: `fintrack-ai`
- Deployment type: Catalyst-Managed Runtime
- Stack: Python 3.11 (the bundled native libraries target CPython 3.11 / Linux AMD64)
- Build file: `deployment/catalyst/fintrack-ai-python311.zip`
- Startup command: `python3 start.py`
- Advanced options / port: 9000 (default)
- Advanced options / memory: 512 MB as an initial allocation; monitor actual usage
- Advanced options / environment variables: add `ML_SERVICE_API_KEY`, using the value after `=` in the locally generated `deployment/catalyst/fintrack-ai.env`. Do not upload that file or commit its value.

The entry point reads `X_ZOHO_CATALYST_LISTEN_PORT`; there is no need to manually add this reserved variable. It falls back to `PORT`, then 8000 for local runs. The model paths work independently of the working directory. API access logs are disabled and prediction text is not logged by the app.

After deployment, open the generated service URL with `/health` appended. The expected JSON is `{"status":"ok","service":"fintrack-ai"}`. A healthy response confirms that both model files loaded. `/predict` requires an `X-API-Key` header matching `ML_SERVICE_API_KEY`. For a test request use `{"text":"Lunch at Subway"}`. The response preserves the existing `predicted_category` and `confidence` fields.

The Java backend now sends this header when `ML_SERVICE_API_KEY` is configured. Set the same key on both services before switching the backend `ML_SERVICE_URL` to the deployed AI service.

## Build again

With Docker running, execute from the repository root:

```sh
python3 ml-service/scripts/build_catalyst.py
```

The builder uses the official Python image for Linux AMD64, installs the pinned runtime dependencies, and runs HTTP tests with external network access disabled before producing the ZIP. It packages only app code, the two existing model artifacts, the dependency lock, and vendor libraries. It excludes the training dataset, local environments, API keys, and database configuration. The runtime lock fixes scikit-learn at 1.8.0, matching the artifacts' training metadata.

If you need a new deployment key, generate one locally (this replaces the local key file; coordinate the backend and AppSail values when rotating):

```sh
python3 -c 'import os,secrets; p="deployment/catalyst/fintrack-ai.env"; f=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600); os.write(f,("ML_SERVICE_API_KEY="+secrets.token_urlsafe(32)+"\n").encode()); os.close(f)'
```

The key file is intentionally outside the ZIP and ignored by Git. A new environment needs its own configured key; the application refuses to start on AppSail without at least 32 characters.

## References

- [AppSail console deployment](https://docs.catalyst.zoho.com/en/serverless/help/appsail/catalyst-managed-runtimes/deploy-from-console/)
- [AppSail runtime and dependency packaging](https://docs.catalyst.zoho.com/en/serverless/help/appsail/catalyst-managed-runtimes/key-concepts/)
- [Startup, port, and environment configuration](https://docs.catalyst.zoho.com/en/serverless/help/appsail/appsail-configurations/)
