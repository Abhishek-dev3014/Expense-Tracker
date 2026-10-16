"""Expense categorization API shared by local development and Catalyst AppSail."""
import logging
import os
from pathlib import Path
import re
import secrets
import string

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
except Exception:
    logger.exception("Could not load the packaged model artifacts")
    raise

app = FastAPI(title="FinTrack AI", docs_url=None, redoc_url=None, openapi_url=None)


class TransactionInput(BaseModel):
    text: str = Field(min_length=1, max_length=500)


def require_api_key(x_api_key: str = Header(default="")):
    # Existing local development remains compatible when no key is configured.
    # AppSail refuses to start without a strong key above.
    if API_KEY and not secrets.compare_digest(x_api_key.encode(), API_KEY.encode()):
        raise HTTPException(status_code=401, detail="Invalid service credentials")


def clean_text(text):
    text = str(text).lower()
    noise = [
        "transaction at", "payment to", "spent on", "order at",
        "upi", "pos", "term", "ref", "imps", "neft", "transfer",
    ]
    for item in noise:
        text = text.replace(item, "")
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"\d+", "", text)
    text = text.translate(str.maketrans("", "", string.punctuation))
    return re.sub(r"\s+", " ", text).strip()


@app.get("/")
@app.get("/health")
def health():
    return {"status": "ok", "service": "fintrack-ai"}


@app.post("/predict", dependencies=[Depends(require_api_key)])
def predict(data: TransactionInput):
    cleaned = clean_text(data.text)
    if not cleaned:
        raise HTTPException(status_code=422, detail="Enter a description containing words")
    vector = vectorizer.transform([cleaned])
    prediction = model.predict(vector)[0]
    probability = model.predict_proba(vector).max()
    return {"predicted_category": str(prediction), "confidence": float(probability)}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("X_ZOHO_CATALYST_LISTEN_PORT") or os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port, access_log=False)
