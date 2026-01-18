#!/bin/bash

# =============================================================================
# Keycloak 初始化脚本
# 用于创建 Flowlet 所需的 Realm、Client、Roles 等配置
# =============================================================================

KEYCLOAK_URL=${KEYCLOAK_URL:-"http://localhost:8180"}
ADMIN_USER=${KEYCLOAK_ADMIN:-"admin"}
ADMIN_PASS=${KEYCLOAK_ADMIN_PASSWORD:-"admin123"}
KEYCLOAK_INSECURE=${KEYCLOAK_INSECURE:-"false"}

FLOWLET_REALM=${FLOWLET_REALM:-"flowlet"}
FLOWLET_CLIENT_ID=${FLOWLET_CLIENT_ID:-"flowlet-app"}
FLOWLET_HOSTS=${FLOWLET_HOSTS:-"localhost"}
FLOWLET_FRONTEND_PORT=${FLOWLET_FRONTEND_PORT:-"5173"}
FLOWLET_BACKEND_PORT=${FLOWLET_BACKEND_PORT:-"8080"}
FLOWLET_FRONTEND_SCHEME=${FLOWLET_FRONTEND_SCHEME:-"https"}
FLOWLET_BACKEND_SCHEME=${FLOWLET_BACKEND_SCHEME:-"http"}
FLOWLET_ALLOW_HTTP=${FLOWLET_ALLOW_HTTP:-"true"}
FLOWLET_ENABLE_OFFLINE_ACCESS=${FLOWLET_ENABLE_OFFLINE_ACCESS:-"false"}
FLOWLET_REDIRECT_URIS=${FLOWLET_REDIRECT_URIS:-""}
FLOWLET_WEB_ORIGINS=${FLOWLET_WEB_ORIGINS:-""}
KEYCLOAK_FRONTEND_URL=${KEYCLOAK_FRONTEND_URL:-""}

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

CURL_ARGS=()
if [ "${KEYCLOAK_INSECURE}" = "true" ]; then
    CURL_ARGS+=("-k")
fi

curl() {
    command curl "${CURL_ARGS[@]}" "$@"
}

split_hosts() {
    local input=$1
    IFS=',' read -r -a HOSTS <<< "$input"
}

to_json_array() {
    local -a values=("$@")
    if [ ${#values[@]} -eq 0 ]; then
        echo "[]"
        return
    fi
    printf '%s\n' "${values[@]}" | jq -R . | jq -s .
}

format_host_url() {
    local scheme=$1
    local host=$2
    local port=$3

    if [ -z "${port}" ]; then
        echo "${scheme}://${host}"
        return
    fi

    if [ "${scheme}" = "https" ] && [ "${port}" = "443" ]; then
        echo "${scheme}://${host}"
        return
    fi

    if [ "${scheme}" = "http" ] && [ "${port}" = "80" ]; then
        echo "${scheme}://${host}"
        return
    fi

    echo "${scheme}://${host}:${port}"
}

build_redirect_uris() {
    local -a redirects=()
    for host in "${HOSTS[@]}"; do
        redirects+=("$(format_host_url "${FLOWLET_FRONTEND_SCHEME}" "${host}" "${FLOWLET_FRONTEND_PORT}")/*")
        if [ "${FLOWLET_ALLOW_HTTP}" = "true" ] && [ "${FLOWLET_FRONTEND_SCHEME}" != "http" ]; then
            redirects+=("$(format_host_url "http" "${host}" "${FLOWLET_FRONTEND_PORT}")/*")
        fi
        redirects+=("$(format_host_url "${FLOWLET_BACKEND_SCHEME}" "${host}" "${FLOWLET_BACKEND_PORT}")/*")
    done
    to_json_array "${redirects[@]}"
}

build_web_origins() {
    local -a origins=()
    for host in "${HOSTS[@]}"; do
        origins+=("$(format_host_url "${FLOWLET_FRONTEND_SCHEME}" "${host}" "${FLOWLET_FRONTEND_PORT}")")
        if [ "${FLOWLET_ALLOW_HTTP}" = "true" ] && [ "${FLOWLET_FRONTEND_SCHEME}" != "http" ]; then
            origins+=("$(format_host_url "http" "${host}" "${FLOWLET_FRONTEND_PORT}")")
        fi
    done
    to_json_array "${origins[@]}"
}

# 等待 Keycloak 启动
wait_for_keycloak() {
    log_info "等待 Keycloak 启动..."
    # Keycloak 26.x 的健康检查在 9000 端口
    local HEALTH_URL="${KEYCLOAK_URL/8180/9000}/health/ready"
    
    for i in {1..60}; do
        # 先尝试 9000 端口 (Keycloak 26.x)
        if curl -sf "${HEALTH_URL}" | grep -q "UP" 2>/dev/null; then
            log_info "Keycloak 已就绪 (via management port)"
            return 0
        fi
        # 再尝试主端口
        if curl -sf "${KEYCLOAK_URL}" >/dev/null 2>&1; then
            log_info "Keycloak 已就绪 (via main port)"
            return 0
        fi
        log_info "  等待中... ($i/60)"
        sleep 2
    done
    log_error "Keycloak 启动超时"
    exit 1
}

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

# 创建 Realm
create_realm() {
    local realm_name=$1
    log_info "创建 Realm: ${realm_name}..."
    
    # 检查是否已存在
    EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer ${TOKEN}" \
        "${KEYCLOAK_URL}/admin/realms/${realm_name}")
    
    if [ "$EXISTS" == "200" ]; then
        log_warn "Realm ${realm_name} 已存在，跳过创建"
        return
    fi
    
    curl -s -X POST "${KEYCLOAK_URL}/admin/realms" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{
            "realm": "'"${realm_name}"'",
            "enabled": true,
            "displayName": "Flowlet - '"${realm_name}"'",
            "registrationAllowed": false,
            "loginWithEmailAllowed": true,
            "duplicateEmailsAllowed": false,
            "resetPasswordAllowed": true,
            "editUsernameAllowed": false,
            "rememberMe": true,
            "verifyEmail": false,
            "bruteForceProtected": true,
            "permanentLockout": false,
            "maxFailureWaitSeconds": 900,
            "minimumQuickLoginWaitSeconds": 60,
            "waitIncrementSeconds": 60,
            "quickLoginCheckMilliSeconds": 1000,
            "maxDeltaTimeSeconds": 43200,
            "failureFactor": 5,
            "accessTokenLifespan": 300,
            "accessTokenLifespanForImplicitFlow": 900,
            "ssoSessionIdleTimeout": 1800,
            "ssoSessionMaxLifespan": 36000,
            "ssoSessionIdleTimeoutRememberMe": 0,
            "ssoSessionMaxLifespanRememberMe": 604800,
            "offlineSessionIdleTimeout": 2592000,
            "offlineSessionMaxLifespanEnabled": false,
            "offlineSessionMaxLifespan": 5184000,
            "accessCodeLifespan": 60,
            "accessCodeLifespanUserAction": 300,
            "accessCodeLifespanLogin": 1800,
            "actionTokenGeneratedByAdminLifespan": 43200,
            "actionTokenGeneratedByUserLifespan": 300,
            "defaultSignatureAlgorithm": "RS256",
            "revokeRefreshToken": false,
            "refreshTokenMaxReuse": 0
        }'
    
    log_info "Realm ${realm_name} 创建完成"
}

# 创建/更新 Client
create_client() {
    local realm_name=$1
    local client_id=$2
    local redirect_uris=$3
    local web_origins=$4

    log_info "在 ${realm_name} 中创建/更新 Client: ${client_id}..."

    CLIENT_UUID=$(curl -s "${KEYCLOAK_URL}/admin/realms/${realm_name}/clients?clientId=${client_id}" \
        -H "Authorization: Bearer ${TOKEN}" | jq -r '.[0].id')

    if [ "$CLIENT_UUID" == "null" ] || [ -z "$CLIENT_UUID" ]; then
        curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${realm_name}/clients" \
            -H "Authorization: Bearer ${TOKEN}" \
            -H "Content-Type: application/json" \
            -d '{
                "clientId": "'"${client_id}"'",
                "name": "Flowlet Application",
                "description": "Flowlet 工作流引擎前端应用",
                "enabled": true,
                "publicClient": true,
                "directAccessGrantsEnabled": true,
                "standardFlowEnabled": true,
                "implicitFlowEnabled": false,
                "serviceAccountsEnabled": false,
                "authorizationServicesEnabled": false,
                "redirectUris": '"${redirect_uris}"',
                "webOrigins": '"${web_origins}"',
                "attributes": {
                    "pkce.code.challenge.method": "S256"
                },
                "protocol": "openid-connect",
                "fullScopeAllowed": true,
                "defaultClientScopes": ["openid", "profile", "email", "roles"]
            }'
        log_info "Client ${client_id} 创建完成"
    else
        CLIENT_JSON=$(curl -s "${KEYCLOAK_URL}/admin/realms/${realm_name}/clients/${CLIENT_UUID}" \
            -H "Authorization: Bearer ${TOKEN}")
        UPDATED_JSON=$(echo "$CLIENT_JSON" | jq \
            --argjson redirects "${redirect_uris}" \
            --argjson origins "${web_origins}" \
            '.redirectUris=$redirects
             | .webOrigins=$origins
             | .publicClient=true
             | .standardFlowEnabled=true
             | .directAccessGrantsEnabled=true
             | .attributes["pkce.code.challenge.method"]="S256"
             | .defaultClientScopes=["openid","profile","email","roles"]')
        curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${realm_name}/clients/${CLIENT_UUID}" \
            -H "Authorization: Bearer ${TOKEN}" \
            -H "Content-Type: application/json" \
            -d "${UPDATED_JSON}" >/dev/null
        log_info "Client ${client_id} 已更新"
    fi

    # 添加 Protocol Mappers
    add_client_mappers "${realm_name}" "${client_id}"
}

ensure_optional_client_scope() {
    local realm_name=$1
    local client_id=$2
    local scope_name=$3

    CLIENT_UUID=$(curl -s "${KEYCLOAK_URL}/admin/realms/${realm_name}/clients?clientId=${client_id}" \
        -H "Authorization: Bearer ${TOKEN}" | jq -r '.[0].id')
    if [ "$CLIENT_UUID" == "null" ] || [ -z "$CLIENT_UUID" ]; then
        return
    fi

    SCOPE_ID=$(curl -s "${KEYCLOAK_URL}/admin/realms/${realm_name}/client-scopes" \
        -H "Authorization: Bearer ${TOKEN}" | jq -r ".[] | select(.name==\"${scope_name}\") | .id")
    if [ -z "$SCOPE_ID" ] || [ "$SCOPE_ID" == "null" ]; then
        return
    fi

    EXISTS=$(curl -s "${KEYCLOAK_URL}/admin/realms/${realm_name}/clients/${CLIENT_UUID}/optional-client-scopes" \
        -H "Authorization: Bearer ${TOKEN}" | jq -r ".[] | select(.name==\"${scope_name}\") | .name")
    if [ -n "$EXISTS" ]; then
        return
    fi

    curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${realm_name}/clients/${CLIENT_UUID}/optional-client-scopes/${SCOPE_ID}" \
        -H "Authorization: Bearer ${TOKEN}" >/dev/null
}

# 为 Client 添加 Protocol Mappers
add_client_mappers() {
    local realm_name=$1
    local client_id=$2
    
    log_info "为 ${client_id} 添加 Protocol Mappers..."
    
    # 获取 Client 的内部 ID
    CLIENT_UUID=$(curl -s "${KEYCLOAK_URL}/admin/realms/${realm_name}/clients?clientId=${client_id}" \
        -H "Authorization: Bearer ${TOKEN}" | jq -r '.[0].id')
    
    if [ "$CLIENT_UUID" == "null" ] || [ -z "$CLIENT_UUID" ]; then
        log_warn "无法获取 Client UUID，跳过 Mapper 配置"
        return
    fi
    
    log_info "  - Client UUID: ${CLIENT_UUID}"
    
    # 直接在 Client 上添加 Protocol Mappers（更可靠的方式）
    # 添加 sub (User ID) Mapper
    RESULT=$(curl -s -w "\n%{http_code}" -X POST \
        "${KEYCLOAK_URL}/admin/realms/${realm_name}/clients/${CLIENT_UUID}/protocol-mappers/models" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "sub-mapper",
            "protocol": "openid-connect",
            "protocolMapper": "oidc-usermodel-property-mapper",
            "consentRequired": false,
            "config": {
                "userinfo.token.claim": "true",
                "user.attribute": "id",
                "id.token.claim": "true",
                "access.token.claim": "true",
                "claim.name": "sub",
                "jsonType.label": "String"
            }
        }')
    
    HTTP_CODE=$(echo "$RESULT" | tail -n1)
    if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "204" ]; then
        log_info "  - 添加 sub (User ID) Mapper ✓"
    elif [ "$HTTP_CODE" == "409" ]; then
        log_warn "  - sub Mapper 已存在，跳过"
    else
        log_warn "  - 添加 sub Mapper 失败 (HTTP $HTTP_CODE)"
    fi
    
    # 添加 username Mapper (确保 preferred_username 在 access token 中)
    RESULT=$(curl -s -w "\n%{http_code}" -X POST \
        "${KEYCLOAK_URL}/admin/realms/${realm_name}/clients/${CLIENT_UUID}/protocol-mappers/models" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "username-mapper",
            "protocol": "openid-connect",
            "protocolMapper": "oidc-usermodel-property-mapper",
            "consentRequired": false,
            "config": {
                "userinfo.token.claim": "true",
                "user.attribute": "username",
                "id.token.claim": "true",
                "access.token.claim": "true",
                "claim.name": "preferred_username",
                "jsonType.label": "String"
            }
        }')
    
    HTTP_CODE=$(echo "$RESULT" | tail -n1)
    if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "204" ]; then
        log_info "  - 添加 username Mapper ✓"
    elif [ "$HTTP_CODE" == "409" ]; then
        log_warn "  - username Mapper 已存在，跳过"
    else
        log_warn "  - 添加 username Mapper 失败 (HTTP $HTTP_CODE)"
    fi
    
    # 添加 realm_access (角色) Mapper 到 ID Token
    RESULT=$(curl -s -w "\n%{http_code}" -X POST \
        "${KEYCLOAK_URL}/admin/realms/${realm_name}/clients/${CLIENT_UUID}/protocol-mappers/models" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "realm-roles-mapper",
            "protocol": "openid-connect",
            "protocolMapper": "oidc-usermodel-realm-role-mapper",
            "consentRequired": false,
            "config": {
                "multivalued": "true",
                "userinfo.token.claim": "true",
                "id.token.claim": "true",
                "access.token.claim": "true",
                "claim.name": "realm_access.roles",
                "jsonType.label": "String"
            }
        }')
    
    HTTP_CODE=$(echo "$RESULT" | tail -n1)
    if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "204" ]; then
        log_info "  - 添加 realm_access (角色) Mapper ✓"
    elif [ "$HTTP_CODE" == "409" ]; then
        log_warn "  - realm_access Mapper 已存在，跳过"
    else
        log_warn "  - 添加 realm_access Mapper 失败 (HTTP $HTTP_CODE)"
    fi
    
    log_info "Protocol Mappers 配置完成"
}

# 创建 Realm Roles
create_realm_roles() {
    local realm_name=$1
    log_info "在 ${realm_name} 中创建角色..."
    
    local roles=("admin" "editor" "viewer")
    local descriptions=("管理员 - 完全权限" "编辑者 - 可编辑工作流" "查看者 - 只读权限")
    
    for i in "${!roles[@]}"; do
        curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${realm_name}/roles" \
            -H "Authorization: Bearer ${TOKEN}" \
            -H "Content-Type: application/json" \
            -d '{
                "name": "'"${roles[$i]}"'",
                "description": "'"${descriptions[$i]}"'",
                "composite": false,
                "clientRole": false
            }'
        log_info "  - 角色 ${roles[$i]} 已创建"
    done
}

# 创建测试用户
create_test_user() {
    local realm_name=$1
    local username=$2
    local password=$3
    local roles=$4
    
    log_info "在 ${realm_name} 中创建测试用户: ${username}..."
    
    # 创建用户
    curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${realm_name}/users" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{
            "username": "'"${username}"'",
            "email": "'"${username}@flowlet.local"'",
            "emailVerified": true,
            "enabled": true,
            "firstName": "'"${username}"'",
            "lastName": "User",
            "credentials": [{
                "type": "password",
                "value": "'"${password}"'",
                "temporary": false
            }]
        }'
    
    # 获取用户 ID
    USER_ID=$(curl -s "${KEYCLOAK_URL}/admin/realms/${realm_name}/users?username=${username}" \
        -H "Authorization: Bearer ${TOKEN}" | jq -r '.[0].id')
    
    if [ "$USER_ID" != "null" ] && [ -n "$USER_ID" ]; then
        # 分配角色
        for role in ${roles//,/ }; do
            ROLE_JSON=$(curl -s "${KEYCLOAK_URL}/admin/realms/${realm_name}/roles/${role}" \
                -H "Authorization: Bearer ${TOKEN}")
            
            curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${realm_name}/users/${USER_ID}/role-mappings/realm" \
                -H "Authorization: Bearer ${TOKEN}" \
                -H "Content-Type: application/json" \
                -d "[${ROLE_JSON}]"
            
            log_info "  - 已为 ${username} 分配角色: ${role}"
        done
    fi
    
    log_info "用户 ${username} 创建完成"
}

# 配置第三方 Identity Provider (GitHub 示例)
setup_github_idp() {
    local realm_name=$1
    local github_client_id=${GITHUB_CLIENT_ID:-""}
    local github_client_secret=${GITHUB_CLIENT_SECRET:-""}
    
    if [ -z "$github_client_id" ] || [ -z "$github_client_secret" ]; then
        log_warn "未配置 GitHub OAuth，跳过 GitHub IdP 设置"
        log_info "提示: 设置环境变量 GITHUB_CLIENT_ID 和 GITHUB_CLIENT_SECRET 以启用 GitHub 登录"
        return
    fi
    
    log_info "在 ${realm_name} 中配置 GitHub Identity Provider..."
    
    curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${realm_name}/identity-provider/instances" \
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
                "clientId": "'"${github_client_id}"'",
                "clientSecret": "'"${github_client_secret}"'",
                "defaultScope": "user:email",
                "syncMode": "IMPORT"
            }
        }'
    
    log_info "GitHub IdP 配置完成"
}

# 配置企业 OIDC Identity Provider
setup_enterprise_oidc() {
    local realm_name=$1
    local oidc_alias=${ENTERPRISE_OIDC_ALIAS:-""}
    local oidc_client_id=${ENTERPRISE_OIDC_CLIENT_ID:-""}
    local oidc_client_secret=${ENTERPRISE_OIDC_CLIENT_SECRET:-""}
    local oidc_issuer=${ENTERPRISE_OIDC_ISSUER:-""}
    
    if [ -z "$oidc_client_id" ] || [ -z "$oidc_issuer" ]; then
        log_warn "未配置企业 OIDC，跳过设置"
        log_info "提示: 设置以下环境变量以启用企业 OIDC:"
        log_info "  - ENTERPRISE_OIDC_ALIAS (别名，如 'corp-sso')"
        log_info "  - ENTERPRISE_OIDC_CLIENT_ID"
        log_info "  - ENTERPRISE_OIDC_CLIENT_SECRET"
        log_info "  - ENTERPRISE_OIDC_ISSUER (issuer URL)"
        return
    fi
    
    log_info "在 ${realm_name} 中配置企业 OIDC Identity Provider..."
    
    curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${realm_name}/identity-provider/instances" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{
            "alias": "'"${oidc_alias}"'",
            "displayName": "企业统一认证",
            "providerId": "oidc",
            "enabled": true,
            "trustEmail": true,
            "storeToken": false,
            "firstBrokerLoginFlowAlias": "first broker login",
            "config": {
                "clientId": "'"${oidc_client_id}"'",
                "clientSecret": "'"${oidc_client_secret}"'",
                "tokenUrl": "'"${oidc_issuer}"'/protocol/openid-connect/token",
                "authorizationUrl": "'"${oidc_issuer}"'/protocol/openid-connect/auth",
                "logoutUrl": "'"${oidc_issuer}"'/protocol/openid-connect/logout",
                "userInfoUrl": "'"${oidc_issuer}"'/protocol/openid-connect/userinfo",
                "jwksUrl": "'"${oidc_issuer}"'/protocol/openid-connect/certs",
                "issuer": "'"${oidc_issuer}"'",
                "defaultScope": "openid profile email",
                "syncMode": "IMPORT",
                "validateSignature": "true",
                "useJwksUrl": "true"
            }
        }'
    
    log_info "企业 OIDC IdP 配置完成"
}

# 配置密码策略
configure_password_policy() {
    local realm_name=$1
    log_info "配置 ${realm_name} 的密码策略..."
    
    # 获取当前 realm 配置并更新密码策略
    curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${realm_name}" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{
            "passwordPolicy": "length(8) and digits(1) and lowerCase(1) and upperCase(1) and specialChars(1) and notUsername"
        }'
    
    log_info "密码策略配置完成 (最少8位，需包含数字、大小写字母、特殊字符)"
}

# 配置登录主题和国际化
configure_realm_theme() {
    local realm_name=$1
    log_info "配置 ${realm_name} 的主题和国际化..."
    
    curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${realm_name}" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{
            "internationalizationEnabled": true,
            "supportedLocales": ["en", "zh-CN"],
            "defaultLocale": "zh-CN",
            "loginTheme": "flowlet-modern",
            "accountTheme": "keycloak.v2",
            "adminTheme": "keycloak.v2",
            "emailTheme": "keycloak"
        }'
    
    log_info "主题和国际化配置完成"
}

update_realm_frontend_url() {
    local realm_name=$1
    local frontend_url=$2

    if [ -z "${frontend_url}" ]; then
        return
    fi

    log_info "设置 ${realm_name} frontendUrl: ${frontend_url}"

    REALM_JSON=$(curl -s "${KEYCLOAK_URL}/admin/realms/${realm_name}" \
        -H "Authorization: Bearer ${TOKEN}")
    UPDATED_JSON=$(echo "${REALM_JSON}" | jq --arg url "${frontend_url}" '.attributes.frontendUrl=$url')
    curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${realm_name}" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d "${UPDATED_JSON}" >/dev/null
}

# 配置邮件服务器 (可选)
configure_smtp() {
    local realm_name=$1
    local smtp_host=${SMTP_HOST:-""}
    local smtp_port=${SMTP_PORT:-"587"}
    local smtp_user=${SMTP_USER:-""}
    local smtp_pass=${SMTP_PASSWORD:-""}
    local smtp_from=${SMTP_FROM:-"noreply@flowlet.local"}
    
    if [ -z "$smtp_host" ]; then
        log_warn "未配置 SMTP，跳过邮件服务器设置"
        log_info "提示: 设置以下环境变量以启用邮件功能:"
        log_info "  - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM"
        return
    fi
    
    log_info "配置 ${realm_name} 的邮件服务器..."
    
    curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${realm_name}" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{
            "smtpServer": {
                "host": "'"${smtp_host}"'",
                "port": "'"${smtp_port}"'",
                "from": "'"${smtp_from}"'",
                "fromDisplayName": "Flowlet",
                "auth": true,
                "user": "'"${smtp_user}"'",
                "password": "'"${smtp_pass}"'",
                "ssl": false,
                "starttls": true
            }
        }'
    
    log_info "邮件服务器配置完成"
}

# =============================================================================
# 主流程
# =============================================================================

main() {
    log_info "=========================================="
    log_info "Flowlet Keycloak 初始化脚本"
    log_info "=========================================="
    
    wait_for_keycloak
    get_admin_token
    
    split_hosts "${FLOWLET_HOSTS}"

    # 创建主 Realm
    create_realm "${FLOWLET_REALM}"

    # 创建/更新 Client (会自动添加 Protocol Mappers)
    if [ -n "${FLOWLET_REDIRECT_URIS}" ]; then
        redirect_uris_json="${FLOWLET_REDIRECT_URIS}"
    else
        redirect_uris_json="$(build_redirect_uris)"
    fi

    if [ -n "${FLOWLET_WEB_ORIGINS}" ]; then
        web_origins_json="${FLOWLET_WEB_ORIGINS}"
    else
        web_origins_json="$(build_web_origins)"
    fi

    create_client "${FLOWLET_REALM}" "${FLOWLET_CLIENT_ID}" "${redirect_uris_json}" "${web_origins_json}"

    if [ "${FLOWLET_ENABLE_OFFLINE_ACCESS}" = "true" ]; then
        ensure_optional_client_scope "${FLOWLET_REALM}" "${FLOWLET_CLIENT_ID}" "offline_access"
    fi
    
    # 创建角色
    create_realm_roles "${FLOWLET_REALM}"
    
    # 创建测试用户
    create_test_user "${FLOWLET_REALM}" "admin" "admin123" "admin,editor,viewer"
    create_test_user "${FLOWLET_REALM}" "editor" "editor123" "editor,viewer"
    create_test_user "${FLOWLET_REALM}" "viewer" "viewer123" "viewer"
    
    # 配置 Realm 设置
    configure_password_policy "${FLOWLET_REALM}"
    configure_realm_theme "${FLOWLET_REALM}"
    configure_smtp "${FLOWLET_REALM}"

    if [ -n "${KEYCLOAK_FRONTEND_URL}" ]; then
        update_realm_frontend_url "master" "${KEYCLOAK_FRONTEND_URL}"
        update_realm_frontend_url "${FLOWLET_REALM}" "${KEYCLOAK_FRONTEND_URL}"
    fi
    
    # 配置第三方 Identity Providers
    setup_github_idp "${FLOWLET_REALM}"
    setup_enterprise_oidc "${FLOWLET_REALM}"
    
    log_info "=========================================="
    log_info "初始化完成！"
    log_info "=========================================="
    log_info ""
    log_info "Keycloak 管理控制台: ${KEYCLOAK_URL}/admin"
    log_info "  - 用户名: ${ADMIN_USER}"
    log_info "  - 密码: ${ADMIN_PASS}"
    log_info ""
    log_info "测试账号:"
    log_info "  - admin / admin123 (管理员)"
    log_info "  - editor / editor123 (编辑者)"
    log_info "  - viewer / viewer123 (查看者)"
    log_info ""
    log_info "Flowlet Realm OIDC 端点:"
    log_info "  - Issuer: ${KEYCLOAK_URL}/realms/${FLOWLET_REALM}"
    log_info "  - JWKS: ${KEYCLOAK_URL}/realms/${FLOWLET_REALM}/protocol/openid-connect/certs"
    log_info "  - Token: ${KEYCLOAK_URL}/realms/${FLOWLET_REALM}/protocol/openid-connect/token"
    log_info ""
}

main "$@"
