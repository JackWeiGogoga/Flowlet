FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN python -m pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY app.py ./

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN useradd --create-home --uid 10001 appuser
USER appuser

EXPOSE 18090

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "18090"]
