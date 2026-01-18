package com.flowlet.engine.code;

import lombok.Data;

import java.util.Map;

@Data
public class CodeExecutionRequest {
    private String language;
    private String code;
    private Map<String, Object> inputs;
    private Map<String, Object> context;
    private Integer timeoutMs;
    private Integer memoryMb;
    private Boolean allowNetwork;
}
