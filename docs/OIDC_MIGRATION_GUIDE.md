# Flowlet OIDC Provider 替换最小改动清单

本文面向希望将 Keycloak 替换为其他 OIDC Provider 的用户，目标是尽量少改动代码与配置。

## 迁移原则

- 保持 OIDC + JWT 资源服务器模式不变
- 只调整 issuer/jwks 与 claim 映射
- 保持前端 `oidc-client-ts` 不变

## 必改项（配置级）

1) 后端 issuer/jwks 配置

- 文件: `flowlet-backend/src/main/resources/application.yml`
- 需要修改:
  - `spring.security.oauth2.resourceserver.jwt.issuer-uri`
  - 或替换为 `jwk-set-uri`

2) 前端 OIDC 配置

- 文件: `flowlet-frontend/src/auth/authConfig.ts`
- 需要修改:
  - `authority` (新 Provider 的 issuer)
  - `client_id`
  - `scope` (确保包含 `openid profile email`，若有角色/租户 claim 也需对应 scope)

## 需要确认/适配的 Claim

目前 Keycloak 依赖的 claim:

- 角色:
  - `realm_access.roles`
  - `resource_access.flowlet-app.roles`
- 租户:
  - 优先 `tenant_id` 自定义 claim
  - 其次从 `issuer` 的 `/realms/{realm}` 推断
- 用户信息:
  - `preferred_username`, `email`, `name`

如果新 Provider 的 claim 不同，需要做以下两处适配。

### 后端角色映射

- 文件: `flowlet-backend/src/main/java/com/flowlet/config/SecurityConfig.java`
- 位置: `KeycloakRealmRoleConverter`
- 修改点:
  - 从新 Provider 的 claim 中读取 roles，并映射为 `ROLE_*`

### 后端租户解析

- 文件: `flowlet-backend/src/main/java/com/flowlet/security/TenantContextFilter.java`
- 位置: `extractTenantContext`
- 修改点:
  - 优先从新 Provider 的 `tenant_id` 或自定义 claim 读取
  - 不建议继续依赖 issuer 中的 `/realms/{realm}` 结构

### 前端角色解析

- 文件: `flowlet-frontend/src/auth/authService.ts`
- 位置: `getUserRoles`
- 修改点:
  - 解析新 Provider 的角色 claim
  - 保持角色名与后端一致（`admin/editor/viewer`）

## 推荐的统一 Claim 约定（便于跨 Provider 迁移）

建议在 IdP 中配置 Mapper，输出以下自定义 claim（推荐）:

```json
{
  "roles": ["admin", "editor", "viewer"],
  "tenant_id": "flowlet"
}
```

这样后端和前端只需读取 `roles` 与 `tenant_id`，迁移成本最低。

## 快速自检清单

- [ ] 后端能通过新 issuer 的 JWKS 验证 JWT
- [ ] 后端能从 JWT 中正确解析角色
- [ ] 后端能正确解析租户（tenant_id）
- [ ] 前端能正确获取用户 profile 与角色
- [ ] 登录页风格已在新 Provider 中配置（如需要）

## 常见迁移目标

- Authentik / ZITADEL / Casdoor: 通常只需配置 Mapper + issuer
- Keycloak -> 其他 OIDC: 主要是 claim 名称不同
- 非 OIDC 方案（如 Supertokens/自建 Session）: 不在本清单范围内，改动会显著增多
