package com.flowlet.engine.code;

import lombok.Data;

@Data
public class CodeExecutionResponse {
    private boolean success;
    private Object output;
    private String stdout;
    private String stderr;
    private Long durationMs;
    private String errorMessage;
}
