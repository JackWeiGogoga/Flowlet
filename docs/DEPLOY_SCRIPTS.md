# 部署脚本使用说明

本项目提供一键部署脚本 `scripts/flowlet-deploy.sh`，用于启动：
- Keycloak（Docker Compose）
- 后端（Spring Boot）
- 前端（Vite build，域名模式下由 OpenResty/Caddy/Nginx 托管）

脚本支持 **localhost / IP + 端口 / 域名** 三种方式。

## 依赖

- docker / docker compose
- Java 17（keytool）
- Node.js + npm
- jq
- openssl
- lsof

## 运行方式

### 1) 本地模式

```bash
MODE=local ./scripts/flowlet-deploy.sh
```

### 2) 服务器 IP 模式

```bash
MODE=ip FLOWLET_IP=148.135.6.189 ./scripts/flowlet-deploy.sh
```

### 3) 域名模式

```bash
MODE=domain FLOWLET_DOMAIN=flowlet.example.com KEYCLOAK_DOMAIN=auth.flowlet.example.com \
OPENRESTY_EMAIL=admin@example.com ENABLE_SELF_SIGNED_CERTS=false \
./scripts/flowlet-deploy.sh
```

### 停止服务

```bash
./scripts/flowlet-stop.sh
```

### 本地调试（只启动 Keycloak）

```bash
MODE=local SKIP_BACKEND=true SKIP_FRONTEND=true ./scripts/flowlet-deploy.sh
```

然后手动启动：

```bash
cd flowlet-backend && mvn spring-boot:run -Dspring-boot.run.profiles=prod
cd flowlet-frontend && npm run dev
```

前端 dev 模式切换 HTTP/HTTPS：
- 默认（本地）使用 HTTP：`.env.local` 中 `VITE_HTTPS=false`
- 临时切换 HTTPS：`VITE_HTTPS=true npm run dev`

保留数据（默认）：`KEYCLOAK_KEEP_VOLUMES=true`  
清理数据：`KEYCLOAK_KEEP_VOLUMES=false ./scripts/flowlet-stop.sh`

### 重启服务

```bash
MODE=ip FLOWLET_IP=148.135.6.189 ./scripts/flowlet-restart.sh
```

## 常用环境变量

- `FLOWLET_REALM`：Keycloak Realm 名称（默认 `flowlet`）
- `FLOWLET_CLIENT_ID`：Keycloak Client ID（默认 `flowlet-app`）
- `FLOWLET_HOSTS`：逗号分隔的 Host 列表（覆盖 MODE 自动值）
- `FLOWLET_IP`：IP 模式使用的地址
- `FLOWLET_DOMAIN`：域名模式使用的域名
- `KEYCLOAK_DOMAIN`：Keycloak 域名（推荐与前端分离）

端口与协议：
- `FRONTEND_PORT`（默认 `5173`）
- `FRONTEND_PUBLIC_PORT`（对外端口，域名模式建议 `443`）
- `BACKEND_PORT`（默认 `8080`）
- `BACKEND_PUBLIC_PORT`（对外端口，域名模式建议 `443`）
- `KEYCLOAK_HTTP_PORT`（默认 `8180`）
- `KEYCLOAK_HTTPS_PORT`（默认 `8443`）
- `KEYCLOAK_MANAGEMENT_PORT`（默认 `9000`）
- `FRONTEND_SCHEME`（默认 `https`）
- `BACKEND_SCHEME`（默认 `http`）
- `KEYCLOAK_SCHEME`（默认 `https`）
- `FLOWLET_ALLOW_HTTP`（是否允许 http 回调，域名模式默认 `false`）

功能控制：
- `ENABLE_SELF_SIGNED_CERTS`：是否生成自签证书（默认 `true`）
- `ENABLE_OFFLINE_ACCESS`：是否启用 `offline_access` scope（默认 `false`）
- `SKIP_BUILD`：跳过前端 build（默认 `false`）
- `SKIP_KEYCLOAK` / `SKIP_BACKEND` / `SKIP_FRONTEND`：跳过某服务
- `LOG_DIR`：日志目录（默认 `/tmp`）
- `FLOWLET_MODEL_HUB_KEY`：模型中心密钥（后端使用，可选）
- `USE_OPENRESTY`：域名模式下使用 OpenResty（默认 `true`）
- `OPENRESTY_EMAIL`：证书申请邮箱（域名模式必填）
- `OPENRESTY_WEB_ROOT`：OpenResty 静态目录（默认 `/var/www/flowlet`）

## 访问地址

脚本执行完成后：
- 本地/IP：前端 `https://<host>:5173`，后端 `http://<host>:8080`
- 域名：前端 `https://<app-domain>/`，后端 `https://<app-domain>/api`
- Keycloak：`https://<auth-domain>/realms/flowlet`（域名模式）
  - HTTP 管理端口仍在 `http://127.0.0.1:8180`

## 证书信任说明

若使用自签证书：
- 浏览器需先访问 `https://<host>:8443/` 并继续访问以信任证书
- 后端会自动导入 Keycloak 证书到 Java `cacerts`

## 备注

- Keycloak 初始化基于 `flowlet-backend/scripts/keycloak-init.sh`
- 脚本默认将 Keycloak 管理 API 走 HTTP（`8180`），避免自签证书校验问题
