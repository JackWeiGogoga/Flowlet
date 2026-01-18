# 域名 + HTTPS 上线指引（脚本版）

本指引提供一键脚本，用于正式域名 + HTTPS 部署。支持 OpenResty、Caddy 或 Nginx。

## 前置条件

- 域名已解析到服务器公网 IP
- 安全组/防火墙放行 80/443
- 本机可用：docker、node、java、jq、openssl、lsof
- 已安装 OpenResty/Caddy/Nginx 之一（推荐 OpenResty）

---

## 方案 A：OpenResty（已安装时推荐）

```bash
APP_DOMAIN=flowlet.example.com AUTH_DOMAIN=auth.flowlet.example.com \
./scripts/flowlet-domain-config.sh

MODE=domain FLOWLET_DOMAIN=flowlet.example.com KEYCLOAK_DOMAIN=auth.flowlet.example.com \
OPENRESTY_EMAIL=admin@example.com ENABLE_SELF_SIGNED_CERTS=false \
./scripts/flowlet-deploy.sh
```

说明：
- 前端构建产物会同步到 `/var/www/flowlet`
- OpenResty 会自动申请证书并代理 `/api` 与 `auth` 域名

---

## 方案 B：Caddy（自动签证书）

### 1) 配置 Keycloak + 前后端环境

```bash
APP_DOMAIN=flowlet.example.com AUTH_DOMAIN=auth.flowlet.example.com \
./scripts/flowlet-domain-config.sh
```

### 2) 启动服务（Keycloak + 后端 + 前端）

```bash
MODE=domain FLOWLET_DOMAIN=flowlet.example.com KEYCLOAK_DOMAIN=auth.flowlet.example.com \
ENABLE_SELF_SIGNED_CERTS=false USE_OPENRESTY=false \
./scripts/flowlet-deploy.sh
```

### 3) 配置 Caddy

```bash
APP_DOMAIN=flowlet.example.com AUTH_DOMAIN=auth.flowlet.example.com \
./scripts/flowlet-domain-caddy.sh
```

---

## 方案 C：Nginx + Certbot

### 1) 配置 Keycloak + 前后端环境

```bash
APP_DOMAIN=flowlet.example.com AUTH_DOMAIN=auth.flowlet.example.com \
./scripts/flowlet-domain-config.sh
```

### 2) 启动服务（Keycloak + 后端 + 前端）

```bash
MODE=domain FLOWLET_DOMAIN=flowlet.example.com KEYCLOAK_DOMAIN=auth.flowlet.example.com \
ENABLE_SELF_SIGNED_CERTS=false USE_OPENRESTY=false \
./scripts/flowlet-deploy.sh
```

### 3) 配置 Nginx + 证书

```bash
APP_DOMAIN=flowlet.example.com AUTH_DOMAIN=auth.flowlet.example.com \
./scripts/flowlet-domain-nginx.sh
```

---

## 说明

- `flowlet-domain-config.sh` 会：
  - 更新 Keycloak Client 的 redirect/web origins（域名 + localhost）
  - 设置 Keycloak `frontendUrl`，避免混合内容
  - 写入前端 Keycloak 配置到 `flowlet-frontend/.env.local`
- 生成后端环境变量文件 `/tmp/flowlet-backend-env.sh`
- 后端启动时使用：
  - `FLOWLET_OIDC_ISSUER=https://<domain>/realms/flowlet`
  - `FLOWLET_MODEL_HUB_KEY=...`（可选）

---

## 可选参数

```
FLOWLET_REALM=flowlet
FLOWLET_CLIENT_ID=flowlet-app
FLOWLET_ENABLE_OFFLINE_ACCESS=false
FLOWLET_MODEL_HUB_KEY=...
```

---

## 访问地址

- 前端：`https://<app-domain>/`
- 后端：`https://<app-domain>/api`
- Keycloak：`https://<auth-domain>/realms/flowlet`
- 管理台：`https://<auth-domain>/admin`
