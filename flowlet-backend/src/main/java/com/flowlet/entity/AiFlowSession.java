package com.flowlet.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("ai_flow_session")
public class AiFlowSession {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String tenantId;

    private String projectId;

    private String flowId;

    private String providerType;

    private String providerKey;

    private String providerId;

    private String model;

    private String currentDsl;

    private String createdBy;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
