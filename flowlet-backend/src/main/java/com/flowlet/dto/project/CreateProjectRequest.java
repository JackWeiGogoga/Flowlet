package com.flowlet.dto.project;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 创建项目请求
 */
@Data
public class CreateProjectRequest {
    
    @NotBlank(message = "Project name is required")
    @Size(min = 1, max = 100, message = "Project name must be between 1 and 100 characters")
    private String name;
    
    @Size(max = 500, message = "Description cannot exceed 500 characters")
    private String description;
}
