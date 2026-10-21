"""AppSail entry point; dependencies are bundled in vendor/ for Linux CPython 3.11."""
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "vendor"))
sys.path.insert(0, str(ROOT))
# A single worker is sufficient for this small model; bound native thread pools.
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("X_ZOHO_CATALYST_LISTEN_PORT") or os.getenv("PORT", "8000"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, workers=1, access_log=False)
