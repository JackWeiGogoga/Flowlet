# Docker 一键部署（单机全套）

此方案使用 Docker Compose 一次性启动：
- Keycloak + Postgres
- Flowlet 后端
- Flowlet 前端（静态构建）
- Code Executor（代码执行服务）
- Vector Store（向量存储服务）
- Caddy 反向代理（自动 HTTPS）

适合生产环境的单机部署。

---

## 1) 准备

- 服务器放行 80/443
- 域名已解析到服务器公网 IP
- 安装 Docker + Docker Compose

---

## 2) 生产域名一键启动

```bash
MODE=domain \
APP_DOMAIN=flowlet.gogoga.top \
AUTH_DOMAIN=auth.gogoga.top \
ACME_EMAIL=admin@gogoga.top \
./scripts/flowlet-docker.sh up
```

访问：
- 前端：`https://flowlet.gogoga.top/`
- Keycloak：`https://auth.gogoga.top/realms/flowlet`
- 管理台：`https://auth.gogoga.top/admin`
 - Code Executor（容器内）：`http://flowlet-code-executor:18090`
 - Vector Store（容器内）：`http://flowlet-vector-stores:18091`

---

## 3) 本地一键启动

```bash
MODE=local ./scripts/flowlet-docker.sh up
```

访问：
- 前端：`http://localhost:5173/`
- 后端：`http://localhost:8080`
- Keycloak：`http://localhost:8180`
- Code Executor：`http://localhost:18090`
- Vector Store：`http://localhost:18091`

---

## 4) IP + 端口部署（Docker，HTTPS）

```bash
MODE=ip FLOWLET_IP=148.135.6.189 ./scripts/flowlet-docker.sh up
```

访问：
- 前端：`https://148.135.6.189:5173/`
- 后端：`https://148.135.6.189:5173/api`
- Keycloak：`https://148.135.6.189:8443`

说明：
- 通过 Nginx 反向代理 + 自签证书（包含 IP SAN）。
- 首次访问需在浏览器中信任证书。

---

## 4) 停止/清理

```bash
MODE=domain \
APP_DOMAIN=flowlet.gogoga.top \
AUTH_DOMAIN=auth.gogoga.top \
ACME_EMAIL=admin@gogoga.top \
./scripts/flowlet-docker.sh down
```

清理 Keycloak/Postgres 数据：

```bash
MODE=domain \
APP_DOMAIN=flowlet.gogoga.top \
AUTH_DOMAIN=auth.gogoga.top \
ACME_EMAIL=admin@gogoga.top \
CLEAN_DATA=true \
./scripts/flowlet-docker.sh down
```

---

## 5) 自定义参数

常用环境变量：

- `FLOWLET_REALM`（默认 `flowlet`）
- `FLOWLET_CLIENT_ID`（默认 `flowlet-app`）
- `FLOWLET_MODEL_HUB_KEY`（模型中心密钥）
- `KEYCLOAK_ADMIN_USER` / `KEYCLOAK_ADMIN_PASSWORD`
- `FLOWLET_ENABLE_OFFLINE_ACCESS`（默认 `true`，启用 refresh_token）

示例：

```bash
MODE=domain \
APP_DOMAIN=flowlet.gogoga.top \
AUTH_DOMAIN=auth.gogoga.top \
ACME_EMAIL=admin@gogoga.top \
FLOWLET_MODEL_HUB_KEY="xxx" \
./scripts/flowlet-docker.sh up
```

---

## 6) 代码修改后如何更新

### 更新所有服务

```bash
MODE=domain APP_DOMAIN=flowlet.gogoga.top AUTH_DOMAIN=auth.gogoga.top ACME_EMAIL=admin@gogoga.top \
./scripts/flowlet-docker.sh up
```

### 仅更新前端/后端（示例）

```bash
# 仅重建并重启前端
MODE=domain APP_DOMAIN=flowlet.gogoga.top AUTH_DOMAIN=auth.gogoga.top ACME_EMAIL=admin@gogoga.top \
docker compose -f docker/docker-compose.full.yml --env-file docker/.env.flowlet up -d --build frontend

# 仅重建并重启后端
MODE=domain APP_DOMAIN=flowlet.gogoga.top AUTH_DOMAIN=auth.gogoga.top ACME_EMAIL=admin@gogoga.top \
docker compose -f docker/docker-compose.full.yml --env-file docker/.env.flowlet up -d --build backend

# 仅重建并重启向量存储
MODE=domain APP_DOMAIN=flowlet.gogoga.top AUTH_DOMAIN=auth.gogoga.top ACME_EMAIL=admin@gogoga.top \
docker compose -f docker/docker-compose.full.yml --env-file docker/.env.flowlet up -d --build flowlet-vector-stores
```

### 只重启（不重建）

```bash
MODE=domain APP_DOMAIN=flowlet.gogoga.top AUTH_DOMAIN=auth.gogoga.top ACME_EMAIL=admin@gogoga.top \
docker compose -f docker/docker-compose.full.yml --env-file docker/.env.flowlet restart
```

## 7) 手动修改 sqlite 数据库
sqlite3 /var/lib/docker/volumes/docker_flowlet_data/_data/flowlet.db
