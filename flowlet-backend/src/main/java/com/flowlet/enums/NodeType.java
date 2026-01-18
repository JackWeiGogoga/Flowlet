package com.flowlet.enums;

/**
 * 节点类型枚举
 */
public enum NodeType {
    /**
     * 开始节点
     */
    START("start"),

    /**
     * 结束节点
     */
    END("end"),

    /**
     * API调用节点 (同步)
     */
    API("api"),

    /**
     * Kafka消息节点 (异步)
     */
    KAFKA("kafka"),

    /**
     * 代码执行节点
     */
    CODE("code"),

    /**
     * 条件判断节点
     */
    CONDITION("condition"),

    /**
     * 数据转换节点
     */
    TRANSFORM("transform"),

    /**
     * 子流程调用节点
     */
    SUBFLOW("subflow"),

    /**
     * 大模型调用节点
     */
    LLM("llm"),

    /**
     * 向量存储节点
     */
    VECTOR_STORE("vector_store"),

    /**
     * 变量赋值节点
     */
    VARIABLE_ASSIGNER("variable_assigner"),

    /**
     * JSON解析器节点
     */
    JSON_PARSER("json_parser"),

    /**
     * Simhash 去重节点
     */
    SIMHASH("simhash"),

    /**
     * 关键词匹配节点
     */
    KEYWORD_MATCH("keyword_match"),

    /**
     * ForEach 循环节点
     */
    FOR_EACH("foreach");

    private final String value;

    NodeType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static NodeType fromValue(String value) {
        for (NodeType type : values()) {
            if (type.value.equals(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown node type: " + value);
    }
}
