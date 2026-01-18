package com.flowlet.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;

import com.flowlet.security.TenantContextFilter;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Spring Security 配置
 * 集成 Keycloak OIDC 认证
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri:}")
    private String issuerUri;

    @Value("${flowlet.security.enabled:true}")
    private boolean securityEnabled;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        if (!securityEnabled) {
            // 开发模式：禁用安全认证
            return http
                    .csrf(csrf -> csrf.disable())
                    .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                    .build();
        }

        http
                // 禁用 CSRF (使用 JWT 无状态认证)
                .csrf(csrf -> csrf.disable())
                
                // 禁用 Session (无状态)
                .sessionManagement(session -> 
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                
                // 配置 CORS
                .cors(cors -> cors.configurationSource(request -> {
                    var corsConfig = new org.springframework.web.cors.CorsConfiguration();
                    corsConfig.setAllowedOriginPatterns(List.of("*"));
                    corsConfig.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
                    corsConfig.setAllowedHeaders(List.of("*"));
                    corsConfig.setAllowCredentials(true);
                    corsConfig.setMaxAge(3600L);
                    return corsConfig;
                }))
                
                // 配置请求授权
                .authorizeHttpRequests(auth -> auth
                        // 公开端点
                        .requestMatchers(
                                "/api/public/**",
                                "/api/health",
                                "/actuator/health",
                                "/swagger-ui/**",
                                "/v3/api-docs/**",
                                "/error"
                        ).permitAll()
                        
                        // 管理员端点
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        
                        // 其他请求需要认证
                        .anyRequest().authenticated()
                )
                
                // 配置 OAuth2 资源服务器 (JWT 验证)
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt
                                .jwtAuthenticationConverter(jwtAuthenticationConverter())
                        )
                )
                
                // 在 JWT 认证之后添加租户上下文过滤器
                .addFilterAfter(new TenantContextFilter(), BearerTokenAuthenticationFilter.class);

        return http.build();
    }

    /**
     * JWT 认证转换器
     * 从 Keycloak JWT Token 中提取角色和权限
     */
    @Bean
    public Converter<Jwt, AbstractAuthenticationToken> jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(new KeycloakRealmRoleConverter());
        return converter;
    }

    /**
     * Keycloak Realm 角色转换器
     * 从 JWT 中提取 realm_access.roles 和 resource_access.{client}.roles
     */
    static class KeycloakRealmRoleConverter implements Converter<Jwt, Collection<GrantedAuthority>> {
        
        @Override
        @SuppressWarnings("unchecked")
        public Collection<GrantedAuthority> convert(@NonNull Jwt jwt) {
            // 提取 realm 级别的角色
            Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
            Collection<String> realmRoles = realmAccess != null 
                    ? (Collection<String>) realmAccess.get("roles") 
                    : Collections.emptyList();

            // 提取 resource/client 级别的角色 (flowlet-app)
            Map<String, Object> resourceAccess = jwt.getClaimAsMap("resource_access");
            Collection<String> clientRoles = Collections.emptyList();
            if (resourceAccess != null && resourceAccess.containsKey("flowlet-app")) {
                Map<String, Object> flowletAccess = (Map<String, Object>) resourceAccess.get("flowlet-app");
                clientRoles = flowletAccess != null 
                        ? (Collection<String>) flowletAccess.get("roles") 
                        : Collections.emptyList();
            }

            // 合并所有角色并转换为 GrantedAuthority
            return Stream.concat(
                    realmRoles.stream().map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase())),
                    clientRoles.stream().map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
            ).collect(Collectors.toSet());
        }
    }
}
