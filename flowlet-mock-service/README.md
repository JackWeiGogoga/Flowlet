# Flowlet Mock Content Service

A tiny standalone mock service for demonstrating third-party REST APIs, built with FastAPI.

## Run with Docker

```bash
docker build -t flowlet-mock .
docker run --rm -p 8801:8801 flowlet-mock
```

Service will be available at `http://localhost:8801`.

The service preloads a small set of sample content items on startup.
Interactive API docs are available at `http://localhost:8801/docs`.

## Endpoints

- `GET /health`
- `POST /mock/content`
- `GET /mock/content/{id}`
- `GET /mock/content?status=draft&tag=demo`
- `GET /mock/content/batch?ids=id1,id2`
- `PUT /mock/content/{id}`
- `DELETE /mock/content/{id}`

## Sample cURL

```bash
curl -X POST http://localhost:8801/mock/content \
  -H 'Content-Type: application/json' \
  -d '{"title":"Hello","body":"demo","tags":["demo"],"status":"draft"}'
```
