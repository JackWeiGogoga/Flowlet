package com.flowlet.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 向量存储提供方配置
 */
@Data
@TableName("vector_store_provider")
public class VectorStoreProvider {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String tenantId;

    /**
     * 提供方标识（milvus/qdrant）
     */
    private String providerKey;

    /**
     * 自定义名称
     */
    private String name;

    private String baseUrl;

    private String apiKeyEncrypted;

    /**
     * 扩展配置 JSON
     */
    private String configJson;

    private Boolean enabled;

    private String createdBy;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
