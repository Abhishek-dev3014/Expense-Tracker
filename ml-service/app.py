"""Expense categorization API shared by local development and Catalyst AppSail."""
import json
import logging
import os
from pathlib import Path
import secrets
from typing import Annotated
from categorization import categorize
from text_processing import clean_text

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
import joblib

logger = logging.getLogger("fintrack.ai")
API_KEY = os.getenv("ML_SERVICE_API_KEY", "").strip()
if (os.getenv("X_ZOHO_CATALYST_LISTEN_PORT") or os.getenv("REQUIRE_API_KEY") == "true") and len(API_KEY) < 32:
    raise RuntimeError("Set ML_SERVICE_API_KEY to a random secret of at least 32 characters in AppSail.")

# Resolve against this file, not the hosting platform's working directory.
ARTIFACTS = Path(__file__).resolve().parent / "model_artifacts"
try:
    model = joblib.load(ARTIFACTS / "model.pkl")
    vectorizer = joblib.load(ARTIFACTS / "vectorizer.pkl")
    metadata = json.loads((ARTIFACTS / "metadata.json").read_text())
except Exception:
    logger.exception("Could not load the packaged model artifacts")
    raise

app = FastAPI(title="FinTrack AI", docs_url=None, redoc_url=None, openapi_url=None)


Description = Annotated[str, Field(min_length=1, max_length=500)]


class TransactionInput(BaseModel):
    text: Description


class BatchInput(BaseModel):
    texts: list[Description] = Field(min_length=1, max_length=1000)


def require_api_key(x_api_key: str = Header(default="")):
    # Existing local development remains compatible when no key is configured.
    # AppSail refuses to start without a strong key above.
    if API_KEY and not secrets.compare_digest(x_api_key.encode(), API_KEY.encode()):
        raise HTTPException(status_code=401, detail="Invalid service credentials")



@app.get("/")
@app.get("/health")
def health():
    return {"status": "ok", "service": "fintrack-ai", "model_version": metadata["model_version"]}


@app.post("/predict", dependencies=[Depends(require_api_key)])
def predict(data: TransactionInput):
    cleaned = clean_text(data.text)
    if not cleaned:
        raise HTTPException(status_code=422, detail="Enter a description containing words")
    return categorize(vectorizer, model, [data.text], metadata)[0]


@app.post("/predict/batch", dependencies=[Depends(require_api_key)])
def predict_batch(data: BatchInput):
    return {"predictions": categorize(vectorizer, model, data.texts, metadata)}



if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("X_ZOHO_CATALYST_LISTEN_PORT") or os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port, access_log=False)
