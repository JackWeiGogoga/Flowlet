# Flowlet 完整部署指南（新机器）

本指南用于在全新服务器上部署 Flowlet（前端 + 后端 + Keycloak），并支持：
- 本地/内网访问（localhost）
- 公网 IP + 端口访问
- 正式域名 + HTTPS 访问（推荐）

---

## 1. 前置依赖

必需：
- Docker + Docker Compose
- Java 17
- Node.js + npm
- jq、openssl、lsof

域名模式（HTTPS）建议：
- OpenResty（已安装则直接用）
- certbot（申请证书）

---

## 2. 一键部署（推荐）

### 2.0 Docker 一键部署（单机全套）

如果希望完全容器化部署（包含 Keycloak + 前后端 + HTTPS 反代）：

```bash
MODE=domain \
APP_DOMAIN=flowlet.gogoga.top \
AUTH_DOMAIN=auth.gogoga.top \
ACME_EMAIL=admin@gogoga.top \
./scripts/flowlet-docker.sh up
```

详细说明见：`docs/DOCKER_DEPLOY.md`

### 2.1 域名部署（生产）

假设：
- 前端域名：`flowlet.gogoga.top`
- 认证域名：`auth.gogoga.top`

执行：

```bash
MODE=domain \
FLOWLET_DOMAIN=flowlet.gogoga.top \
KEYCLOAK_DOMAIN=auth.gogoga.top \
OPENRESTY_EMAIL=admin@gogoga.top \
ENABLE_SELF_SIGNED_CERTS=false \
./scripts/flowlet-deploy.sh
```

说明：
- 会自动初始化 Keycloak（realm、client、角色、主题）
- 会写入前端配置 `flowlet-frontend/.env.local`
- 会构建前端并同步到 `/var/www/flowlet`
- 会自动配置 OpenResty 并申请证书（需要 certbot）

访问：
- 前端：`https://flowlet.gogoga.top/`
- Keycloak：`https://auth.gogoga.top/realms/flowlet`
- 管理台：`https://auth.gogoga.top/admin`

### 2.2 公网 IP 部署（开发/测试）

```bash
MODE=ip FLOWLET_IP=148.135.6.189 ./scripts/flowlet-deploy.sh
```

访问：
- 前端：`https://148.135.6.189:5173`
- 后端：`http://148.135.6.189:8080`
- Keycloak：`https://148.135.6.189:8443`

### 2.3 本地部署

```bash
MODE=local ./scripts/flowlet-deploy.sh
```

访问（本地）：
- 前端：`http://localhost:5173`
- 后端：`http://localhost:8080`
- Keycloak：`http://localhost:8180`
- 管理台：`http://localhost:8180/admin`

本地调试（仅启动 Keycloak，其它手动）：

```bash
MODE=local SKIP_BACKEND=true SKIP_FRONTEND=true ./scripts/flowlet-deploy.sh
```

然后手动启动：

```bash
cd flowlet-backend && mvn spring-boot:run -Dspring-boot.run.profiles=prod
cd flowlet-frontend && npm run dev
```

本地前端 dev 模式切换 HTTP/HTTPS：
- 默认（本地）使用 HTTP：`.env.local` 中 `VITE_HTTPS=false`
- 临时切换 HTTPS：`VITE_HTTPS=true npm run dev`

---

## 3. 停止与重启

```bash
./scripts/flowlet-stop.sh
```

清理 Keycloak 数据（重置环境）：

```bash
KEYCLOAK_KEEP_VOLUMES=false ./scripts/flowlet-stop.sh
```

重启：

```bash
MODE=domain FLOWLET_DOMAIN=flowlet.gogoga.top KEYCLOAK_DOMAIN=auth.gogoga.top \
OPENRESTY_EMAIL=admin@gogoga.top ENABLE_SELF_SIGNED_CERTS=false \
./scripts/flowlet-restart.sh
```

---

## 4. 常用环境变量

- `FLOWLET_REALM`（默认 `flowlet`）
- `FLOWLET_CLIENT_ID`（默认 `flowlet-app`）
- `FLOWLET_MODEL_HUB_KEY`（可选，模型中心密钥）
- `FRONTEND_PUBLIC_PORT`（对外端口，域名模式建议 `443`）
- `BACKEND_PUBLIC_PORT`（对外端口，域名模式建议 `443`）
- `FLOWLET_ALLOW_HTTP`（是否允许 http 回调，域名模式默认 `false`）
- `USE_OPENRESTY`（域名模式默认 `true`，设置 `false` 表示自行配置 Caddy/Nginx）
- `OPENRESTY_WEB_ROOT`（默认 `/var/www/flowlet`）

---

## 5. 常见问题

### 5.1 登录报 `invalid redirect_uri`

原因：Keycloak client 回调地址未更新。  
解决：重新运行域名配置脚本：

```bash
APP_DOMAIN=flowlet.gogoga.top AUTH_DOMAIN=auth.gogoga.top \
./scripts/flowlet-domain-config.sh
```

### 5.2 前端访问 500

原因：OpenResty 无法读取前端静态目录。  
解决：确保文件在 `/var/www/flowlet`，并有读取权限。

---

## 6. 日志

- 前端：`/tmp/flowlet-frontend.log`
- 后端：`/tmp/flowlet-backend.log`
- OpenResty：`/usr/local/openresty/nginx/logs/error.log`
