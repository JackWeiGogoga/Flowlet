package com.flowlet.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.Optional;

/**
 * 安全工具类
 * 用于获取当前认证用户的信息
 */
public class SecurityUtils {

    private SecurityUtils() {
        // 工具类，禁止实例化
    }

    /**
     * 获取当前认证对象
     */
    public static Optional<Authentication> getAuthentication() {
        return Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication());
    }

    /**
     * 获取当前用户ID (Keycloak subject)
     */
    public static String getCurrentUserId() {
        return getAuthentication()
                .filter(auth -> auth instanceof JwtAuthenticationToken)
                .map(auth -> ((JwtAuthenticationToken) auth).getToken().getSubject())
                .orElse(null);
    }

    /**
     * 获取当前用户ID，如果未认证则抛出异常
     */
    public static String requireCurrentUserId() {
        String userId = getCurrentUserId();
        if (userId == null) {
            throw new IllegalStateException("User not authenticated");
        }
        return userId;
    }

    /**
     * 获取当前用户的 JWT Token
     */
    public static Optional<Jwt> getCurrentJwt() {
        return getAuthentication()
                .filter(auth -> auth instanceof JwtAuthenticationToken)
                .map(auth -> ((JwtAuthenticationToken) auth).getToken());
    }

    /**
     * 获取当前用户名（preferred_username claim）
     */
    public static String getCurrentUsername() {
        return getCurrentJwt()
                .map(jwt -> jwt.getClaimAsString("preferred_username"))
                .orElse(null);
    }

    /**
     * 获取当前用户邮箱
     */
    public static String getCurrentUserEmail() {
        return getCurrentJwt()
                .map(jwt -> jwt.getClaimAsString("email"))
                .orElse(null);
    }

    /**
     * 获取当前用户显示名（name claim）
     */
    public static String getCurrentUserDisplayName() {
        return getCurrentJwt()
                .map(jwt -> jwt.getClaimAsString("name"))
                .orElse(getCurrentUsername());
    }

    /**
     * 获取当前租户ID（从 JWT 的自定义 claim 中）
     */
    public static String getCurrentTenantId() {
        return getCurrentJwt()
                .map(jwt -> jwt.getClaimAsString("tenant_id"))
                .orElse("default");
    }

    /**
     * 检查当前用户是否已认证
     */
    public static boolean isAuthenticated() {
        return getCurrentUserId() != null;
    }

    /**
     * 检查当前用户是否有指定角色
     */
    public static boolean hasRole(String role) {
        return getAuthentication()
                .map(auth -> auth.getAuthorities().stream()
                        .anyMatch(a -> a.getAuthority().equals("ROLE_" + role.toUpperCase())))
                .orElse(false);
    }

    /**
     * 检查当前用户是否为管理员
     */
    public static boolean isAdmin() {
        return hasRole("ADMIN");
    }
}
