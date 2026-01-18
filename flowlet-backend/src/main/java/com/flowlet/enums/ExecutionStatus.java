package com.flowlet.enums;

/**
 * 执行状态枚举
 */
public enum ExecutionStatus {
    /**
     * 等待中
     */
    PENDING("pending"),

    /**
     * 运行中
     */
    RUNNING("running"),

    /**
     * 暂停 (等待异步回调)
     */
    PAUSED("paused"),

    /**
     * 已完成
     */
    COMPLETED("completed"),

    /**
     * 失败
     */
    FAILED("failed");

    private final String value;

    ExecutionStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
