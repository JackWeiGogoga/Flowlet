package com.flowlet.dto.project;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * 更新成员角色请求
 */
@Data
public class UpdateMemberRoleRequest {
    
    @NotBlank(message = "Role is required")
    @Pattern(regexp = "admin|editor|viewer", message = "Role must be one of: admin, editor, viewer")
    private String role;
}
