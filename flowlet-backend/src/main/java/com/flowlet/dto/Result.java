package com.flowlet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 统一响应结果
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Result<T> {

    /**
     * 状态码
     */
    private Integer code;

    /**
     * 消息
     */
    private String message;

    /**
     * 数据
     */
    private T data;

    public static <T> Result<T> success(T data) {
        return Result.<T>builder()
                .code(200)
                .message("success")
                .data(data)
                .build();
    }

    public static <T> Result<T> success() {
        return success(null);
    }

    public static <T> Result<T> error(String message) {
        return Result.<T>builder()
                .code(500)
                .message(message)
                .build();
    }

    public static <T> Result<T> error(Integer code, String message) {
        return Result.<T>builder()
                .code(code)
                .message(message)
                .build();
    }
}
