package com.flowlet.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 关键词词条
 */
@Data
@TableName("keyword_term")
public class KeywordTerm {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String libraryId;

    private String term;

    private String matchMode;

    private String pinyin;

    private Boolean enabled;

    private String createdBy;

    private String createdByName;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
