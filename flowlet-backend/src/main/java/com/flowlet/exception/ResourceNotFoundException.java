package com.flowlet.exception;

import org.springframework.http.HttpStatus;

/**
 * 资源未找到异常
 */
public class ResourceNotFoundException extends BusinessException {

    public ResourceNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND");
    }

    public ResourceNotFoundException(String resourceType, String id) {
        super(resourceType + " not found: " + id, HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND");
    }
}
