package com.flowlet.security;

/**
 * 租户上下文持有器
 * 使用 ThreadLocal 在请求线程中传递租户信息
 */
public class TenantContextHolder {
    
    private static final ThreadLocal<TenantContext> CONTEXT = new ThreadLocal<>();
    
    /**
     * 设置当前线程的租户上下文
     */
    public static void setContext(TenantContext context) {
        CONTEXT.set(context);
    }
    
    /**
     * 获取当前线程的租户上下文
     */
    public static TenantContext getContext() {
        return CONTEXT.get();
    }
    
    /**
     * 清除当前线程的租户上下文
     */
    public static void clear() {
        CONTEXT.remove();
    }
    
    /**
     * 获取当前租户 ID
     */
    public static String getTenantId() {
        TenantContext context = getContext();
        return context != null ? context.getTenantId() : null;
    }
    
    /**
     * 获取当前用户 ID
     */
    public static String getUserId() {
        TenantContext context = getContext();
        return context != null ? context.getUserId() : null;
    }
    
    /**
     * 获取当前用户名
     */
    public static String getUsername() {
        TenantContext context = getContext();
        return context != null ? context.getUsername() : null;
    }
    
    /**
     * 检查当前用户是否有指定角色
     */
    public static boolean hasRole(String role) {
        TenantContext context = getContext();
        return context != null && context.hasRole(role);
    }
    
    /**
     * 检查当前用户是否是管理员
     */
    public static boolean isAdmin() {
        TenantContext context = getContext();
        return context != null && context.isAdmin();
    }
}
