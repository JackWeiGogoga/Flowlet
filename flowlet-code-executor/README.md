# Flowlet Code Executor (Python)

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8090
```

## Docker

```bash
docker build -t flowlet-code-executor .
docker run --rm -p 8090:8090 flowlet-code-executor
```

## API

- `GET /health`
- `POST /execute`

Example:

```json
{
  "language": "python",
  "code": "def run(inputs, context):\n    return {\"ok\": True}",
  "inputs": {},
  "context": {},
  "timeoutMs": 3000,
  "memoryMb": 128,
  "allowNetwork": false
}
```
