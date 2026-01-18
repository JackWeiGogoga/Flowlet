package com.flowlet.security;

import lombok.Builder;
import lombok.Data;

import java.util.Set;

/**
 * 租户上下文信息
 * 从 JWT Token 中提取的租户和用户信息
 */
@Data
@Builder
public class TenantContext {
    
    /**
     * 租户 ID (对应 Keycloak Realm 或自定义 claim)
     */
    private String tenantId;
    
    /**
     * 用户 ID (Keycloak sub claim)
     */
    private String userId;
    
    /**
     * 用户名
     */
    private String username;
    
    /**
     * 用户邮箱
     */
    private String email;
    
    /**
     * 用户全名
     */
    private String fullName;
    
    /**
     * 用户角色列表
     */
    private Set<String> roles;
    
    /**
     * 原始 JWT Token
     */
    private String accessToken;
    
    /**
     * Token 过期时间 (Unix timestamp)
     */
    private Long expiresAt;
    
    /**
     * 检查是否拥有指定角色
     */
    public boolean hasRole(String role) {
        return roles != null && roles.contains(role.toUpperCase());
    }
    
    /**
     * 检查是否是管理员
     */
    public boolean isAdmin() {
        return hasRole("ADMIN");
    }
}
