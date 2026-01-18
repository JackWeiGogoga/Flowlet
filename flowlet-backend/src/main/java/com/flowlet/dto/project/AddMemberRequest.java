package com.flowlet.dto.project;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * 添加项目成员请求
 */
@Data
public class AddMemberRequest {
    
    @NotBlank(message = "User ID is required")
    private String userId;
    
    @NotBlank(message = "Role is required")
    @Pattern(regexp = "admin|editor|viewer", message = "Role must be one of: admin, editor, viewer")
    private String role;
}
