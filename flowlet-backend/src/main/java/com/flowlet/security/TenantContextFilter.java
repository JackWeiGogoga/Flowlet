package com.flowlet.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 租户上下文过滤器
 * 从 JWT Token 中提取租户信息并设置到 ThreadLocal
 * 
 * 注意：此 Filter 需要在 SecurityConfig 中手动注册到 Spring Security Filter Chain 中，
 * 并放在 BearerTokenAuthenticationFilter 之后执行，以确保 SecurityContext 已经被设置
 */
@Slf4j
public class TenantContextFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, 
                                    @NonNull HttpServletResponse response, 
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            
            if (authentication instanceof JwtAuthenticationToken jwtAuth) {
                Jwt jwt = jwtAuth.getToken();
                
                // 调试：打印 JWT 中的关键 claim
                log.debug("JWT claims - sub: {}, preferred_username: {}, email: {}", 
                        jwt.getSubject(), 
                        jwt.getClaimAsString("preferred_username"),
                        jwt.getClaimAsString("email"));
                log.debug("JWT all claims: {}", jwt.getClaims().keySet());
                
                TenantContext context = extractTenantContext(jwt, jwtAuth);
                TenantContextHolder.setContext(context);
                
                log.debug("Tenant context set: tenantId={}, userId={}, username={}", 
                        context.getTenantId(), context.getUserId(), context.getUsername());
            } else {
                log.debug("Authentication is not JwtAuthenticationToken: {}", 
                        authentication != null ? authentication.getClass().getName() : "null");
            }
            
            filterChain.doFilter(request, response);
        } finally {
            // 确保清理 ThreadLocal，避免内存泄漏
            TenantContextHolder.clear();
        }
    }

    /**
     * 从 JWT 中提取租户上下文
     */
    private TenantContext extractTenantContext(Jwt jwt, JwtAuthenticationToken jwtAuth) {
        // 提取租户 ID
        // 方式1: 从 issuer 中提取 (Keycloak issuer 格式: http://keycloak/realms/{realm})
        String tenantId = extractTenantFromIssuer(jwt.getIssuer().toString());
        
        // 方式2: 从自定义 claim 中提取 (如果有的话)
        if (jwt.hasClaim("tenant_id")) {
            tenantId = jwt.getClaimAsString("tenant_id");
        }
        
        // 提取用户角色
        Set<String> roles = jwtAuth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(auth -> auth.startsWith("ROLE_") ? auth.substring(5) : auth)
                .collect(Collectors.toSet());
        
        // 提取过期时间
        Instant expiresAt = jwt.getExpiresAt();
        
        // 获取用户 ID：使用 sub claim
        String userId = jwt.getSubject();
        
        return TenantContext.builder()
                .tenantId(tenantId)
                .userId(userId)
                .username(jwt.getClaimAsString("preferred_username"))
                .email(jwt.getClaimAsString("email"))
                .fullName(jwt.getClaimAsString("name"))
                .roles(roles)
                .accessToken(jwt.getTokenValue())
                .expiresAt(expiresAt != null ? expiresAt.getEpochSecond() : null)
                .build();
    }

    /**
     * 从 Keycloak issuer URL 中提取 realm 名称作为租户 ID
     * 格式: http://keycloak:8080/realms/{realm-name}
     */
    private String extractTenantFromIssuer(String issuer) {
        if (issuer == null) {
            return "default";
        }
        
        String[] parts = issuer.split("/realms/");
        if (parts.length == 2) {
            return parts[1].replace("/", "");
        }
        
        return "default";
    }
}
