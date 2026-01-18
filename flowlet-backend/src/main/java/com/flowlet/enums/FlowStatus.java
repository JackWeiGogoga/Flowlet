package com.flowlet.enums;

/**
 * 流程状态枚举
 */
public enum FlowStatus {
    /**
     * 草稿
     */
    DRAFT("draft"),

    /**
     * 已发布
     */
    PUBLISHED("published"),

    /**
     * 已禁用
     */
    DISABLED("disabled"),

    /**
     * 调试（临时流程定义，用于调试执行）
     */
    DEBUG("debug");

    private final String value;

    FlowStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
