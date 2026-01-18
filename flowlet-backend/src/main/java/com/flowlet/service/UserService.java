package com.flowlet.service;

import com.flowlet.entity.Project;

/**
 * 用户服务接口
 * 处理用户相关的业务逻辑
 */
public interface UserService {

    /**
     * 处理用户首次登录
     * - 检查用户是否已有项目
     * - 如果没有，创建默认项目
     * 
     * @return 用户的默认项目（新创建的或已有的第一个项目）
     */
    Project ensureUserInitialized();

    /**
     * 获取用户的默认项目
     * 如果用户没有任何项目，返回 null
     */
    Project getDefaultProject();

    /**
     * 创建用户的默认项目
     */
    Project createDefaultProject();

    /**
     * 检查用户是否已初始化（是否有项目）
     */
    boolean isUserInitialized();
}
