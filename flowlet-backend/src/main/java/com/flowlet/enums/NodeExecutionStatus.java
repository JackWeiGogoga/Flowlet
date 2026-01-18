package com.flowlet.enums;

/**
 * 节点执行状态枚举
 */
public enum NodeExecutionStatus {
    /**
     * 等待执行
     */
    PENDING("pending"),

    /**
     * 执行中
     */
    RUNNING("running"),

    /**
     * 等待回调
     */
    WAITING_CALLBACK("waiting_callback"),

    /**
     * 已完成
     */
    COMPLETED("completed"),

    /**
     * 失败
     */
    FAILED("failed"),

    /**
     * 已跳过
     */
    SKIPPED("skipped");

    private final String value;

    NodeExecutionStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
