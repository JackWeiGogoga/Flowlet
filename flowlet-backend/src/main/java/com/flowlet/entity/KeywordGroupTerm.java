package com.flowlet.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 关键词规则组-词条关联
 */
@Data
@TableName("keyword_group_term")
public class KeywordGroupTerm {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String groupId;

    private String termId;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
