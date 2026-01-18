package com.flowlet.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 项目成员实体
 * 控制用户对项目的访问权限
 */
@Data
@TableName("project_member")
public class ProjectMember {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    /**
     * 项目ID
     */
    private String projectId;

    /**
     * 用户ID（来自 Keycloak）
     */
    private String userId;

    /**
     * 成员角色
     * owner - 项目所有者，拥有所有权限
     * admin - 管理员，可管理项目和成员
     * editor - 编辑者，可编辑流程
     * viewer - 查看者，只读权限
     */
    private String role;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    /**
     * 项目成员角色枚举
     */
    public enum Role {
        OWNER("owner"),
        ADMIN("admin"),
        EDITOR("editor"),
        VIEWER("viewer");

        private final String value;

        Role(String value) {
            this.value = value;
        }

        public String getValue() {
            return value;
        }

        public static Role fromValue(String value) {
            for (Role role : values()) {
                if (role.value.equals(value)) {
                    return role;
                }
            }
            throw new IllegalArgumentException("Unknown role: " + value);
        }

        /**
         * 检查是否有编辑权限
         */
        public boolean canEdit() {
            return this == OWNER || this == ADMIN || this == EDITOR;
        }

        /**
         * 检查是否有管理权限
         */
        public boolean canManage() {
            return this == OWNER || this == ADMIN;
        }

        /**
         * 检查是否是所有者
         */
        public boolean isOwner() {
            return this == OWNER;
        }
    }
}
