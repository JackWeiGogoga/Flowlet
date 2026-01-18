# Flowlet 认证与权限系统

本文档介绍 Flowlet 项目的认证和权限系统架构及使用方式。

## 架构概览

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────┐
│   Flowlet       │     │    Flowlet      │     │       Keycloak          │
│   Frontend      │────▶│    Backend      │────▶│  (Identity Provider)    │
│   (React)       │     │  (Spring Boot)  │     │                         │
└────────┬────────┘     └────────┬────────┘     │  ┌───────────────────┐  │
         │                       │              │  │ Realm: flowlet    │  │
         │                       │              │  │  - GitHub IdP     │  │
         │   OIDC Login Flow     │              │  │  - 企业 OIDC IdP  │  │
         └───────────────────────┼──────────────▶  │  - Users & Roles  │  │
                                 │              │  └───────────────────┘  │
                        JWT Token Validation    │                         │
                                 └──────────────▶  ┌───────────────────┐  │
                                                │  │ Realm: tenant-x   │  │
                                                │  │  (Multi-tenant)   │  │
                                                │  └───────────────────┘  │
                                                └─────────────────────────┘
```

## 快速开始

### 1. 启动 Keycloak

```bash
# 进入项目目录
cd flowlet-backend

# 启动 Keycloak (包含 PostgreSQL)
docker-compose -f docker/docker-compose-keycloak.yml up -d

# 等待启动完成后，初始化配置
chmod +x scripts/keycloak-init.sh
./scripts/keycloak-init.sh
```

### 2. 访问 Keycloak 管理控制台

- **地址**: http://localhost:8180/admin
- **用户名**: admin
- **密码**: admin123

### 3. 启动后端 (启用认证)

```bash
# 使用 keycloak profile 启动
mvn spring-boot:run -Dspring-boot.run.profiles=keycloak
```

### 4. 测试账号

| 用户名 | 密码      | 角色                  | 权限       |
| ------ | --------- | --------------------- | ---------- |
| admin  | admin123  | admin, editor, viewer | 完全权限   |
| editor | editor123 | editor, viewer        | 编辑工作流 |
| viewer | viewer123 | viewer                | 只读       |

## API 认证

### 获取 Access Token

```bash
# 使用密码模式获取 Token (仅用于测试)
curl -X POST "http://localhost:8180/realms/flowlet/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=flowlet-app" \
  -d "username=admin" \
  -d "password=admin123" \
  -d "grant_type=password"
```

### 调用受保护的 API

```bash
# 使用 Access Token 调用 API
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  http://localhost:8080/api/user/me
```

### API 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "username": "admin",
    "email": "admin@flowlet.local",
    "fullName": "admin User",
    "tenantId": "flowlet",
    "roles": ["ADMIN", "EDITOR", "VIEWER"],
    "expiresAt": 1703123456,
    "emailVerified": true
  }
}
```

## 权限控制

### 角色定义

| 角色   | 说明   | 权限范围                         |
| ------ | ------ | -------------------------------- |
| ADMIN  | 管理员 | 全部权限，包括用户管理、系统配置 |
| EDITOR | 编辑者 | 创建、编辑、删除工作流           |
| VIEWER | 查看者 | 只读访问，查看工作流和执行历史   |

### 使用权限注解

```java
// 仅管理员可访问
@PreAuthorize("hasRole('ADMIN')")
public void adminOnlyMethod() { }

// 管理员或编辑者可访问
@PreAuthorize("hasAnyRole('ADMIN', 'EDITOR')")
public void editorMethod() { }

// 自定义权限表达式
@PreAuthorize("@authService.canAccessFlow(#flowId)")
public void accessFlow(String flowId) { }
```

### URL 级别权限控制

在 `SecurityConfig.java` 中配置:

```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/public/**").permitAll()
    .requestMatchers("/api/admin/**").hasRole("ADMIN")
    .requestMatchers(HttpMethod.POST, "/api/flows/**").hasAnyRole("ADMIN", "EDITOR")
    .requestMatchers(HttpMethod.DELETE, "/api/flows/**").hasRole("ADMIN")
    .anyRequest().authenticated()
)
```

## 多租户支持

### 租户隔离方式

使用 Keycloak Realm 实现租户隔离:

```
Keycloak
├── Realm: flowlet (默认/公共租户)
├── Realm: tenant-acme (ACME 公司)
├── Realm: tenant-globex (Globex 公司)
└── ...
```

### 获取当前租户信息

```java
// 在 Controller 或 Service 中
@GetMapping("/flows")
public List<Flow> getFlows() {
    // 获取当前租户 ID
    String tenantId = TenantContextHolder.getTenantId();

    // 获取当前用户 ID
    String userId = TenantContextHolder.getUserId();

    // 获取完整的租户上下文
    TenantContext context = TenantContextHolder.getContext();

    // 基于租户过滤数据
    return flowService.findByTenantId(tenantId);
}
```

### 多租户数据隔离

建议在数据库表中添加 `tenant_id` 字段:

```sql
CREATE TABLE flow_definition (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,  -- 租户 ID
    created_by VARCHAR(64),           -- 创建者用户 ID
    name VARCHAR(255),
    ...
    INDEX idx_tenant_id (tenant_id)
);
```

使用 MyBatis-Plus 拦截器自动填充:

```java
@Component
public class TenantInterceptor implements InnerInterceptor {
    @Override
    public void beforeQuery(...) {
        // 自动添加 tenant_id 条件
    }
}
```

## 接入企业 OIDC

### 配置步骤

1. 在 Keycloak 管理控制台中:

   - 进入 **Realm Settings** → **Identity Providers**
   - 点击 **Add provider** → **OpenID Connect v1.0**

2. 填写企业 OIDC 信息:

   - **Alias**: 如 `corp-sso`
   - **Display Name**: 如 `企业统一认证`
   - **Discovery endpoint**: 企业 OIDC 的 `.well-known/openid-configuration` 地址
   - **Client ID**: 从企业 OIDC 获取
   - **Client Secret**: 从企业 OIDC 获取

3. 或通过脚本配置:

```bash
export ENTERPRISE_OIDC_ALIAS="corp-sso"
export ENTERPRISE_OIDC_CLIENT_ID="your-client-id"
export ENTERPRISE_OIDC_CLIENT_SECRET="your-secret"
export ENTERPRISE_OIDC_ISSUER="https://sso.your-company.com/realms/corp"

./scripts/keycloak-init.sh
```

## 接入第三方登录

### GitHub 登录

1. 在 [GitHub Developer Settings](https://github.com/settings/developers) 创建 OAuth App

2. 配置:

   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:8180/realms/flowlet/broker/github/endpoint`

3. 设置环境变量并运行初始化脚本:

```bash
export GITHUB_CLIENT_ID="your-github-client-id"
export GITHUB_CLIENT_SECRET="your-github-secret"
./scripts/keycloak-init.sh
```

### Google 登录

在 Keycloak 管理控制台:

1. **Identity Providers** → **Add provider** → **Google**
2. 填写 Google OAuth Client ID 和 Secret

### 微信登录

需要安装 Keycloak 微信登录扩展:

- [keycloak-wechat](https://github.com/jyyjcc/keycloak-wechat)

## 前端集成

### 推荐使用 OIDC 客户端库

```bash
# 安装 oidc-client-ts
pnpm add oidc-client-ts
```

### 配置示例

```typescript
// src/auth/authConfig.ts
import { UserManager, WebStorageStateStore } from "oidc-client-ts";

export const authConfig = {
  authority: "http://localhost:8180/realms/flowlet",
  client_id: "flowlet-app",
  redirect_uri: "http://localhost:5173/callback",
  post_logout_redirect_uri: "http://localhost:5173",
  response_type: "code",
  scope: "openid profile email",
  userStore: new WebStorageStateStore({ store: window.localStorage }),
};

export const userManager = new UserManager(authConfig);
```

### 登录流程

```typescript
// 发起登录
await userManager.signinRedirect();

// 处理回调
await userManager.signinRedirectCallback();

// 获取用户信息
const user = await userManager.getUser();

// 发起登出
await userManager.signoutRedirect();
```

## 配置参考

### application.yml (生产环境)

```yaml
spring:
  profiles:
    active: prod

  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://keycloak.your-domain.com/realms/flowlet

flowlet:
  security:
    enabled: true
```

### 环境变量

| 变量名                    | 说明                   | 默认值                |
| ------------------------- | ---------------------- | --------------------- |
| `KEYCLOAK_URL`            | Keycloak 地址          | http://localhost:8180 |
| `KEYCLOAK_ADMIN`          | 管理员用户名           | admin                 |
| `KEYCLOAK_ADMIN_PASSWORD` | 管理员密码             | admin123              |
| `KEYCLOAK_CLIENT_SECRET`  | Client Secret          | -                     |
| `GITHUB_CLIENT_ID`        | GitHub OAuth Client ID | -                     |
| `GITHUB_CLIENT_SECRET`    | GitHub OAuth Secret    | -                     |
| `ENTERPRISE_OIDC_ISSUER`  | 企业 OIDC Issuer       | -                     |

## 故障排查

### 常见问题

1. **401 Unauthorized**

   - 检查 Token 是否过期
   - 验证 issuer-uri 配置是否正确
   - 确认 Keycloak 服务是否正常运行

2. **403 Forbidden**

   - 检查用户是否拥有所需角色
   - 查看 SecurityConfig 中的权限配置

3. **Token 验证失败**
   - 确认前后端使用相同的 Realm
   - 检查 JWKS 端点是否可访问: `curl http://localhost:8180/realms/flowlet/protocol/openid-connect/certs`

### 调试日志

```yaml
logging:
  level:
    org.springframework.security: DEBUG
    org.springframework.security.oauth2: DEBUG
```
