# Flowlet

![License](https://img.shields.io/badge/License-MIT-green.svg)
![Java](https://img.shields.io/badge/Java-17-007396.svg)
![Spring%20Boot](https://img.shields.io/badge/Spring%20Boot-3.5.9-6DB33F.svg)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB.svg)
![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF.svg)
![Ant%20Design](https://img.shields.io/badge/Ant%20Design-6.1.0-1677FF.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)
![Keycloak](https://img.shields.io/badge/Keycloak-OIDC-0052CC.svg)

A visual workflow orchestration system for content processing. Build flows with drag-and-drop, execute them with async callbacks (HTTP/Kafka), and monitor real-time status.

[English](#overview) | [中文](README.zh-CN.md)

### Overview

Flowlet is a lightweight, visual workflow orchestration platform for content pipelines. It supports flow design, execution, monitoring, and async callbacks with tenant-aware authentication based on Keycloak.

### Modules

- `flowlet-backend/` - Spring Boot API + execution engine (`http://localhost:8080`)
- `flowlet-frontend/` - React workflow editor and admin UI (`http://localhost:5173`)
- `flowlet-code-executor/` - Python code execution service (`http://localhost:8090`)
- `flowlet-embedding/` - Text/image/multimodal embedding service (`http://localhost:8000`)
- `flowlet-vector-stores/` - Vector store gateway (Milvus/Qdrant) (`http://localhost:18091`)
- `flowlet-mock-service/` - Mock content API for demos (`http://localhost:8801`)

### Key Features

- Visual flow editor with drag-and-drop nodes
- Flow execution engine with pause/resume and async callbacks
- Callback modes: HTTP and Kafka
- Real-time execution status for flows and nodes
- Tenant-aware auth via Keycloak (OIDC)

### Tech Stack

- Backend: Java 17, Spring Boot 3.5.9, Spring Security/OAuth2, MyBatis Plus 3.5.5, SQLite, WebFlux, Kafka
- Frontend: React 19.2.0, TypeScript 5.9.x, Vite 7.2.4, Ant Design 6.1.0, React Flow 12.10.0, Zustand 5.0.9
- Services: FastAPI-based embedding/vector-store/mock services

### Quick Start

#### Docker (All-in-one)

```bash
MODE=domain \
APP_DOMAIN=flowlet.gogoga.top \
AUTH_DOMAIN=auth.gogoga.top \
ACME_EMAIL=admin@gogoga.top \
./scripts/flowlet-docker.sh up
```

More details in `docs/DOCKER_DEPLOY.md`.

#### Backend

```bash
cd flowlet-backend
mvn clean package -DskipTests
java -jar target/flowlet-backend-1.0.0.jar
# or
mvn spring-boot:run
```

#### Frontend

```bash
cd flowlet-frontend
npm install
npm run dev
```

Type checking after changes:

```bash
npm run typecheck
```

#### Kafka (Optional)

```bash
cd flowlet-backend/docker
docker-compose -f docker-compose-kafka.yml up -d
```

### Documentation

- `docs/DOCKER_DEPLOY.md` - Docker deployment (full stack)
- `docs/DEPLOY_GUIDE.md` - New machine deployment guide
- `docs/IP_PORT_DEPLOY.md` - IP + port deployment
- `docs/AUTH_SYSTEM.md` - Auth and permissions (Keycloak)
- `docs/OIDC_MIGRATION_GUIDE.md` - OIDC provider migration
- `docs/DATA_STRUCTURE_DESIGN.md` - Data structure design

### License

MIT License
