FROM python:3.11-slim-bookworm@sha256:0a310eeecf4e1f5a0743f9a6520c90c88d089c903ca5fd283f501e3a805f5f89
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    REQUIRE_API_KEY=true \
    PORT=9000
WORKDIR /app
COPY requirements-catalyst.txt ./
RUN pip install --no-cache-dir --only-binary=:all: -r requirements-catalyst.txt \
    && useradd --uid 10001 --create-home app
COPY --chown=app:app app.py start.py ./
COPY --chown=app:app model_artifacts/model.pkl model_artifacts/vectorizer.pkl ./model_artifacts/
USER app
EXPOSE 9000
CMD ["python3", "start.py"]
