package com.flowlet.exception;

import org.springframework.http.HttpStatus;

/**
 * 权限拒绝异常
 */
public class AccessDeniedException extends BusinessException {

    public AccessDeniedException(String message) {
        super(message, HttpStatus.FORBIDDEN, "ACCESS_DENIED");
    }

    public AccessDeniedException() {
        super("You don't have permission to access this resource", HttpStatus.FORBIDDEN, "ACCESS_DENIED");
    }
}
