# Flowlet

![License](https://img.shields.io/badge/License-MIT-green.svg)
![Java](https://img.shields.io/badge/Java-17-007396.svg)
![Spring%20Boot](https://img.shields.io/badge/Spring%20Boot-3.5.9-6DB33F.svg)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB.svg)
![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF.svg)
![Ant%20Design](https://img.shields.io/badge/Ant%20Design-6.1.0-1677FF.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)
![Keycloak](https://img.shields.io/badge/Keycloak-OIDC-0052CC.svg)

一个面向内容处理与数据管道的可视化流程编排系统。通过拖拽设计流程，支持 HTTP/Kafka 异步回调与实时状态监控。

[English](README.md) | [中文](#中文)

## 中文

### 概览

Flowlet 是一个轻量级可视化流程编排系统，用于内容处理与数据管道。支持拖拽式流程设计、执行、监控，以及 HTTP/Kafka 异步回调；基于 Keycloak 的 OIDC 实现租户隔离认证。

### 模块组成

- `flowlet-backend/` - Spring Boot 后端与执行引擎（`http://localhost:8080`）
- `flowlet-frontend/` - React 流程编辑器与管理界面（`http://localhost:5173`）
- `flowlet-code-executor/` - Python 代码执行服务（`http://localhost:8090`）
- `flowlet-embedding/` - 文本/图片/多模态向量化服务（`http://localhost:8000`）
- `flowlet-vector-stores/` - 向量数据库网关（Milvus/Qdrant）（`http://localhost:18091`）
- `flowlet-mock-service/` - 模拟内容服务（`http://localhost:8801`）

### 核心特性

- 可视化流程编辑与节点编排
- 支持暂停/恢复的流程执行引擎
- HTTP 与 Kafka 异步回调
- 实时流程与节点状态监控
- Keycloak OIDC 多租户认证

### 技术栈

- 后端：Java 17、Spring Boot 3.5.9、Spring Security/OAuth2、MyBatis Plus 3.5.5、SQLite、WebFlux、Kafka
- 前端：React 19.2.0、TypeScript 5.9.x、Vite 7.2.4、Ant Design 6.1.0、React Flow 12.10.0、Zustand 5.0.9
- 服务：基于 FastAPI 的向量化/向量存储/模拟服务

### 快速开始

#### Docker 一键部署（推荐）

```bash
MODE=domain \
APP_DOMAIN=flowlet.gogoga.top \
AUTH_DOMAIN=auth.gogoga.top \
ACME_EMAIL=admin@gogoga.top \
./scripts/flowlet-docker.sh up
```

详见 `docs/DOCKER_DEPLOY.md`。

#### 后端启动

```bash
cd flowlet-backend
mvn clean package -DskipTests
java -jar target/flowlet-backend-1.0.0.jar
# 或
mvn spring-boot:run
```

#### 前端启动

```bash
cd flowlet-frontend
npm install
npm run dev
```

改动后类型检查：

```bash
npm run typecheck
```

#### Kafka（可选）

```bash
cd flowlet-backend/docker
docker-compose -f docker-compose-kafka.yml up -d
```

### 文档索引

- `docs/DOCKER_DEPLOY.md` - Docker 全套部署
- `docs/DEPLOY_GUIDE.md` - 新机器部署指南
- `docs/IP_PORT_DEPLOY.md` - IP + 端口部署
- `docs/AUTH_SYSTEM.md` - 认证与权限系统
- `docs/OIDC_MIGRATION_GUIDE.md` - OIDC 提供方迁移
- `docs/DATA_STRUCTURE_DESIGN.md` - 数据结构设计

### License

MIT License
