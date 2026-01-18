package com.flowlet.dto.project;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 更新项目请求
 */
@Data
public class UpdateProjectRequest {
    
    @Size(min = 1, max = 100, message = "Project name must be between 1 and 100 characters")
    private String name;
    
    @Size(max = 500, message = "Description cannot exceed 500 characters")
    private String description;
}
