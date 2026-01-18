#!/bin/bash

# =============================================================================
# 添加 GitHub Identity Provider 到已有的 Keycloak Realm
# =============================================================================

KEYCLOAK_URL=${KEYCLOAK_URL:-"http://localhost:8180"}
ADMIN_USER=${KEYCLOAK_ADMIN:-"admin"}
ADMIN_PASS=${KEYCLOAK_ADMIN_PASSWORD:-"admin123"}
REALM_NAME=${REALM_NAME:-"flowlet"}

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查必需的环境变量
if [ -z "$GITHUB_CLIENT_ID" ] || [ -z "$GITHUB_CLIENT_SECRET" ]; then
    log_error "请设置以下环境变量:"
    log_error "  export GITHUB_CLIENT_ID='你的GitHub OAuth App Client ID'"
    log_error "  export GITHUB_CLIENT_SECRET='你的GitHub OAuth App Client Secret'"
    echo ""
    log_info "获取方式:"
    log_info "  1. 访问 https://github.com/settings/developers"
    log_info "  2. 点击 'New OAuth App' 或选择已有的 App"
    log_info "  3. Authorization callback URL 填写:"
    log_info "     ${KEYCLOAK_URL}/realms/${REALM_NAME}/broker/github/endpoint"
    exit 1
fi

# 获取 Admin Token
get_admin_token() {
    log_info "获取管理员 Token..."
    TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=${ADMIN_USER}" \
        -d "password=${ADMIN_PASS}" \
        -d "grant_type=password" \
        -d "client_id=admin-cli" | jq -r '.access_token')
    
    if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
        log_error "获取 Token 失败，请检查管理员账号密码"
        exit 1
    fi
    log_info "Token 获取成功"
}

# 配置 GitHub Identity Provider
setup_github_idp() {
    log_info "在 ${REALM_NAME} 中配置 GitHub Identity Provider..."
    
    # 先检查是否已存在
    EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer ${TOKEN}" \
        "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/identity-provider/instances/github")
    
    if [ "$EXISTS" == "200" ]; then
        log_warn "GitHub IdP 已存在，更新配置..."
        
        # 更新已有配置
        RESULT=$(curl -s -w "\n%{http_code}" -X PUT \
            "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/identity-provider/instances/github" \
            -H "Authorization: Bearer ${TOKEN}" \
            -H "Content-Type: application/json" \
            -d '{
                "alias": "github",
                "displayName": "GitHub",
                "providerId": "github",
                "enabled": true,
                "trustEmail": true,
                "storeToken": false,
                "addReadTokenRoleOnCreate": false,
                "firstBrokerLoginFlowAlias": "first broker login",
                "config": {
                    "clientId": "'"${GITHUB_CLIENT_ID}"'",
                    "clientSecret": "'"${GITHUB_CLIENT_SECRET}"'",
                    "defaultScope": "user:email read:user",
                    "syncMode": "IMPORT"
                }
            }')
    else
        # 创建新配置
        RESULT=$(curl -s -w "\n%{http_code}" -X POST \
            "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/identity-provider/instances" \
            -H "Authorization: Bearer ${TOKEN}" \
            -H "Content-Type: application/json" \
            -d '{
                "alias": "github",
                "displayName": "GitHub",
                "providerId": "github",
                "enabled": true,
                "trustEmail": true,
                "storeToken": false,
                "addReadTokenRoleOnCreate": false,
                "firstBrokerLoginFlowAlias": "first broker login",
                "config": {
                    "clientId": "'"${GITHUB_CLIENT_ID}"'",
                    "clientSecret": "'"${GITHUB_CLIENT_SECRET}"'",
                    "defaultScope": "user:email read:user",
                    "syncMode": "IMPORT"
                }
            }')
    fi
    
    HTTP_CODE=$(echo "$RESULT" | tail -n1)
    if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "204" ]; then
        log_info "GitHub IdP 配置成功 ✓"
    else
        BODY=$(echo "$RESULT" | sed '$d')
        log_error "配置失败 (HTTP $HTTP_CODE): $BODY"
        exit 1
    fi
}

# 添加 GitHub 用户属性映射器（可选，增强用户信息同步）
add_github_mappers() {
    log_info "添加 GitHub 用户属性映射器..."
    
    # 映射 GitHub 头像
    curl -s -X POST \
        "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/identity-provider/instances/github/mappers" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "github-avatar",
            "identityProviderMapper": "hardcoded-attribute-idp-mapper",
            "identityProviderAlias": "github",
            "config": {
                "syncMode": "INHERIT",
                "attribute": "picture"
            }
        }' 2>/dev/null
    
    # 映射 GitHub 用户名
    curl -s -X POST \
        "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/identity-provider/instances/github/mappers" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "github-username",
            "identityProviderMapper": "github-user-attribute-mapper",
            "identityProviderAlias": "github",
            "config": {
                "syncMode": "IMPORT",
                "jsonField": "login",
                "userAttribute": "github_username"
            }
        }' 2>/dev/null
    
    log_info "映射器配置完成"
}

# =============================================================================
# 主流程
# =============================================================================

main() {
    log_info "=========================================="
    log_info "添加 GitHub Identity Provider"
    log_info "=========================================="
    
    get_admin_token
    setup_github_idp
    add_github_mappers
    
    log_info "=========================================="
    log_info "配置完成！"
    log_info "=========================================="
    echo ""
    log_info "GitHub 登录已启用。用户可以在登录页面看到 'GitHub' 按钮。"
    echo ""
    log_info "测试登录:"
    log_info "  1. 访问应用登录页面"
    log_info "  2. 点击 'GitHub' 按钮"
    log_info "  3. 在 GitHub 授权页面登录并授权"
    log_info "  4. 首次登录会要求确认用户信息"
    echo ""
    log_info "Keycloak 管理控制台: ${KEYCLOAK_URL}/admin"
    log_info "  → Realm: ${REALM_NAME} → Identity Providers → GitHub"
    echo ""
}

main "$@"
