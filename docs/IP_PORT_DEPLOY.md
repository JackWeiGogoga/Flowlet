# IP + 端口访问部署指引

本文档记录在服务器上使用 **IP + 端口** 访问 Flowlet 前后端与 Keycloak 的配置步骤。

适用场景：
- 直接使用公网 IP（如 `148.135.6.189`）部署
- 前端走 HTTPS（PKCE 需要安全上下文）
- Keycloak 自签证书

## Docker IP + HTTPS 方案

如果希望使用 Docker 一键部署并强制 HTTPS（自签证书）：

```bash
MODE=ip FLOWLET_IP=148.135.6.189 ./scripts/flowlet-docker.sh up
```

访问：
- 前端：`https://148.135.6.189:5173/`
- Keycloak：`https://148.135.6.189:8443`

注意：
- 证书为自签证书（包含 IP SAN），需手动信任。

## 访问地址

- 前端（build 预览）：`https://<IP>:5173`
- 后端：`http://<IP>:8080`
- Keycloak HTTPS：`https://<IP>:8443`
- Keycloak HTTP（可保留）：`http://<IP>:8180`

## 关键点概览

- 前端必须 **HTTPS**，否则 PKCE 失败（`Missing parameter: code_challenge_method`）。
- Keycloak 自签证书必须包含 **SAN（IP）**，否则后端 SSL 校验失败（`No subject alternative names present`）。
- 后端需信任 Keycloak 证书（导入 Java `cacerts`）。

---

## 1) Keycloak 启用 HTTPS（自签证书）

### 1.1 生成带 SAN 的证书（IP + localhost）

```bash
cat <<'EOF' > /tmp/keycloak_openssl.cnf
[req]
default_bits       = 2048
prompt             = no
default_md         = sha256
req_extensions     = v3_req
distinguished_name = dn

[dn]
CN = 148.135.6.189

[v3_req]
subjectAltName = @alt_names

[alt_names]
IP.1 = 148.135.6.189
DNS.1 = localhost
EOF

mkdir -p docker/keycloak-ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/keycloak-ssl/server.key \
  -out docker/keycloak-ssl/server.crt \
  -config /tmp/keycloak_openssl.cnf \
  -extensions v3_req

chmod 644 docker/keycloak-ssl/server.key docker/keycloak-ssl/server.crt
```

### 1.2 更新 Keycloak Compose

`docker/docker-compose-keycloak.yml` 关键项：

```yaml
services:
  keycloak:
    environment:
      KC_HOSTNAME: 148.135.6.189
      KC_HOSTNAME_STRICT: false
      KC_HOSTNAME_STRICT_HTTPS: true
      KC_HTTP_ENABLED: true
      KC_HTTPS_CERTIFICATE_FILE: /opt/keycloak/conf/ssl/server.crt
      KC_HTTPS_CERTIFICATE_KEY_FILE: /opt/keycloak/conf/ssl/server.key
    command: start
    ports:
      - "8180:8080"
      - "8443:8443"
    volumes:
      - ./keycloak-ssl:/opt/keycloak/conf/ssl
```

重启：

```bash
docker compose -f docker/docker-compose-keycloak.yml up -d --force-recreate
```

### 1.3 更新 Keycloak Client 重定向地址

需要包含：
- `https://<IP>:5173/*`
- `http://<IP>:5173/*`（可选）

可以通过脚本或控制台更新 `flowlet-app` 的 `redirectUris` 与 `webOrigins`。

---

## 2) 前端配置（HTTPS + build 预览）

### 2.1 Keycloak URL

`flowlet-frontend/.env.local`：

```
VITE_KEYCLOAK_URL=https://148.135.6.189:8443/realms/flowlet
VITE_KEYCLOAK_CLIENT_ID=flowlet-app
```

### 2.2 Vite HTTPS（dev + preview）

`flowlet-frontend/vite.config.ts`：

```ts
server: {
  https: { key: fs.readFileSync("ssl/dev.key"), cert: fs.readFileSync("ssl/dev.crt") },
  port: 5173,
}
preview: {
  https: { key: fs.readFileSync("ssl/dev.key"), cert: fs.readFileSync("ssl/dev.crt") },
  host: "0.0.0.0",
  port: 5173,
}
```

### 2.3 build + 预览启动

```bash
cd flowlet-frontend
npm run build
nohup npm run preview -- --host 0.0.0.0 --port 5173 > /tmp/flowlet-frontend.log 2>&1 &
```

---

## 3) 后端配置（HTTPS Issuer + 信任证书）

### 3.1 修改 issuer-uri

`flowlet-backend/src/main/resources/application.yml`：

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://148.135.6.189:8443/realms/flowlet
```

### 3.2 导入 Keycloak 证书到 Java 信任库

```bash
keytool -importcert -noprompt -trustcacerts \
  -alias flowlet-keycloak-dev \
  -file docker/keycloak-ssl/server.crt \
  -keystore /usr/lib/jvm/java-17-openjdk-amd64/lib/security/cacerts \
  -storepass changeit
```

重启后端：

```bash
cd flowlet-backend
nohup mvn -q spring-boot:run -Dspring-boot.run.profiles=prod > /tmp/flowlet-backend.log 2>&1 &
```

---

## 4) 浏览器证书信任

使用自签证书时，浏览器会拦截 Keycloak HTTPS 请求。

先访问并信任：

```
https://<IP>:8443/
```

选择“继续访问”（忽略风险），然后再访问：

```
https://<IP>:5173/
```

---

## 5) 常见错误与解决

### `Missing parameter: code_challenge_method`
- 原因：前端非 HTTPS，PKCE 无法生成
- 处理：前端必须 HTTPS

### `ERR_CERT_AUTHORITY_INVALID`
- 原因：浏览器不信任自签 Keycloak 证书
- 处理：先访问 `https://<IP>:8443/` 并继续访问

### `No subject alternative names present`
- 原因：证书不含 IP 的 SAN
- 处理：重新生成证书，加入 `IP.1 = <IP>`

### `PKIX path building failed`
- 原因：后端不信任 Keycloak 证书
- 处理：导入证书到 Java `cacerts` 并重启后端

---

## 6) 生产建议

如果要长期对外服务，建议改为：
- 申请域名 + 正式证书（Let's Encrypt）
- 使用 Nginx/Caddy 做统一入口和 HTTPS
- 前端改为静态文件部署
