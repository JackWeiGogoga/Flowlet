FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml ./pyproject.toml
RUN python - <<'PY'
import tomllib
from pathlib import Path

data = tomllib.loads(Path("pyproject.toml").read_text(encoding="utf-8"))
deps = data.get("project", {}).get("dependencies", [])
Path("/tmp/requirements.txt").write_text("\n".join(deps), encoding="utf-8")
PY

RUN python -m pip install --upgrade pip \
    && pip install --no-cache-dir -r /tmp/requirements.txt

COPY app ./app
COPY main.py ./main.py

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN useradd --create-home --uid 10001 appuser
USER appuser

EXPOSE 18091

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "18091"]
