"""Build and smoke-test a self-contained Python 3.11 / Linux AMD64 AppSail ZIP.

Run: python3 ml-service/scripts/build_catalyst.py
Requires a running Docker daemon. Secrets and training data are never packaged.
"""
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile

SOURCE = Path(__file__).resolve().parents[1]
OUTPUT = SOURCE.parent / "deployment" / "catalyst"
IMAGE = "python:3.11-slim-bookworm@sha256:0a310eeecf4e1f5a0743f9a6520c90c88d089c903ca5fd283f501e3a805f5f89"


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="fintrack-build-", dir=OUTPUT) as temporary:
        bundle = Path(temporary)
        for name in ("app.py", "start.py", "requirements-catalyst.txt"):
            shutil.copy2(SOURCE / name, bundle / name)
        shutil.copytree(SOURCE / "model_artifacts", bundle / "model_artifacts")
        subprocess.run([
            "docker", "run", "--rm", "--platform", "linux/amd64",
            "--mount", f"type=bind,source={bundle},target=/build",
            IMAGE, "python", "-m", "pip", "install", "--no-cache-dir",
            "--only-binary=:all:", "--target", "/build/vendor", "-r", "/build/requirements-catalyst.txt",
        ], check=True)
        subprocess.run([
            "docker", "run", "--rm", "--platform", "linux/amd64", "--network", "none",
            "--mount", f"type=bind,source={bundle},target=/build,readonly",
            "--mount", f"type=bind,source={SOURCE / 'tests'},target=/tests,readonly",
            "--env", "FINTRACK_BUNDLE=/build", IMAGE, "python", "/tests/test_deployment.py",
        ], check=True)
        destination = OUTPUT / "fintrack-ai-python311.zip"
        with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
            for path in sorted(bundle.rglob("*")):
                if path.is_file() and "__pycache__" not in path.parts and path.suffix != ".pyc":
                    archive.write(path, path.relative_to(bundle))
        print(f"Upload ZIP: {destination}")
        print(f"Size: {destination.stat().st_size / 1024 / 1024:.1f} MiB")


if __name__ == "__main__":
    main()
