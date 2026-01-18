package com.flowlet.dto.model;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ModelProviderTestResponse {
    private boolean success;
    private String message;
    private long latencyMs;
}
