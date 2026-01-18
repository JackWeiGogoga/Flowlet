package com.flowlet.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("ai_flow_message")
public class AiFlowMessage {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String sessionId;

    private String role;

    private String content;

    private String patchJson;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
