package com.flowlet.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Simhash 记录实体
 */
@Data
@TableName("simhash_record")
public class SimhashRecord {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    /**
     * 所属项目ID
     */
    private String projectId;

    /**
     * 所属流程ID
     */
    private String flowId;

    /**
     * 业务内容ID（同项目内唯一）
     */
    private String contentId;

    /**
     * 内容类型
     */
    private String contentType;

    /**
     * 64-bit Simhash
     */
    private Long simhash64;

    /**
     * 分桶字段（8段，每段8bit）
     */
    @TableField("bucket_0")
    private Integer bucket0;
    @TableField("bucket_1")
    private Integer bucket1;
    @TableField("bucket_2")
    private Integer bucket2;
    @TableField("bucket_3")
    private Integer bucket3;
    @TableField("bucket_4")
    private Integer bucket4;
    @TableField("bucket_5")
    private Integer bucket5;
    @TableField("bucket_6")
    private Integer bucket6;
    @TableField("bucket_7")
    private Integer bucket7;

    /**
     * 分词数量
     */
    private Integer tokenCount;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
