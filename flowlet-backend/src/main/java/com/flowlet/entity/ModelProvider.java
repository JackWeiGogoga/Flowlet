package com.flowlet.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 模型提供方配置
 */
@Data
@TableName("model_provider")
public class ModelProvider {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String tenantId;

    /**
     * STANDARD / CUSTOM
     */
    private String providerType;

    /**
     * 标准提供方标识
     */
    private String providerKey;

    /**
     * 自定义名称
     */
    private String name;

    private String baseUrl;

    private String apiKeyEncrypted;

    private String defaultModel;

    private String models;

    private Boolean enabled;

    private String createdBy;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
