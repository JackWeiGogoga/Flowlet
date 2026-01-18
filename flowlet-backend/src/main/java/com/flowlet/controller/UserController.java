package com.flowlet.controller;

import com.flowlet.dto.Result;
import com.flowlet.entity.Project;
import com.flowlet.security.TenantContext;
import com.flowlet.security.TenantContextHolder;
import com.flowlet.service.UserService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;

/**
 * 用户信息接口
 */
@Slf4j
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * 获取当前登录用户信息
     * 同时检查并初始化用户（首次登录时创建默认项目）
     */
    @GetMapping("/me")
    public Result<UserInfo> getCurrentUser(@AuthenticationPrincipal Jwt jwt) {
        TenantContext context = TenantContextHolder.getContext();
        
        if (context == null) {
            return Result.error("用户未登录");
        }
        
        UserInfo userInfo = new UserInfo();
        userInfo.setUserId(context.getUserId());
        userInfo.setUsername(context.getUsername());
        userInfo.setEmail(context.getEmail());
        userInfo.setFullName(context.getFullName());
        userInfo.setTenantId(context.getTenantId());
        userInfo.setRoles(context.getRoles());
        userInfo.setExpiresAt(context.getExpiresAt());
        
        // 从 JWT 中获取额外信息
        if (jwt != null) {
            userInfo.setEmailVerified(jwt.getClaimAsBoolean("email_verified"));
            userInfo.setLocale(jwt.getClaimAsString("locale"));
        }
        
        // 检查用户是否已初始化
        userInfo.setInitialized(userService.isUserInitialized());
        
        // 获取默认项目
        Project defaultProject = userService.getDefaultProject();
        if (defaultProject != null) {
            userInfo.setDefaultProjectId(defaultProject.getId());
            userInfo.setDefaultProjectName(defaultProject.getName());
        }
        
        return Result.success(userInfo);
    }

    /**
     * 用户初始化接口
     * 前端在用户首次登录时调用，确保用户有默认项目
     */
    @PostMapping("/initialize")
    public Result<InitResult> initializeUser() {
        TenantContext context = TenantContextHolder.getContext();
        
        if (context == null) {
            return Result.error("用户未登录");
        }
        
        log.info("Initializing user: {} ({})", context.getUsername(), context.getUserId());
        
        // 确保用户已初始化
        Project defaultProject = userService.ensureUserInitialized();
        
        if (defaultProject == null) {
            return Result.error("用户初始化失败：无法创建默认项目");
        }
        
        InitResult result = new InitResult();
        result.setNewUser(!userService.isUserInitialized());
        result.setDefaultProjectId(defaultProject.getId());
        result.setDefaultProjectName(defaultProject.getName());
        result.setMessage("用户初始化成功");
        
        return Result.success(result);
    }

    /**
     * 检查用户是否已初始化
     */
    @GetMapping("/initialized")
    public Result<Boolean> isInitialized() {
        return Result.success(userService.isUserInitialized());
    }

    /**
     * 获取当前用户权限列表
     */
    @GetMapping("/permissions")
    public Result<Set<String>> getPermissions() {
        TenantContext context = TenantContextHolder.getContext();
        
        if (context == null) {
            return Result.error("用户未登录");
        }
        
        return Result.success(context.getRoles());
    }

    /**
     * 管理员专用接口示例
     */
    @GetMapping("/admin/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    public Result<String> adminDashboard() {
        return Result.success("欢迎访问管理员仪表板");
    }

    /**
     * 编辑者专用接口示例
     */
    @GetMapping("/editor/workspace")
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR')")
    public Result<String> editorWorkspace() {
        return Result.success("欢迎访问编辑器工作区");
    }

    @Data
    public static class UserInfo {
        private String userId;
        private String username;
        private String email;
        private String fullName;
        private String tenantId;
        private Set<String> roles;
        private Long expiresAt;
        private Boolean emailVerified;
        private String locale;
        
        // 新增：用户初始化状态
        private Boolean initialized;
        private String defaultProjectId;
        private String defaultProjectName;
    }

    @Data
    public static class InitResult {
        private Boolean newUser;
        private String defaultProjectId;
        private String defaultProjectName;
        private String message;
    }
}
