package com.flowlet.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.flowlet.entity.Project;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 项目 Mapper
 */
@Mapper
public interface ProjectMapper extends BaseMapper<Project> {

    /**
     * 查询用户可见的项目列表
     * 通过 project_member 表关联查询
     */
    @Select("SELECT p.* FROM project p " +
            "INNER JOIN project_member pm ON p.id = pm.project_id " +
            "WHERE pm.user_id = #{userId} " +
            "ORDER BY p.created_at DESC")
    List<Project> selectByUserId(@Param("userId") String userId);

    /**
     * 查询租户下用户可见的项目列表
     */
    @Select("SELECT p.* FROM project p " +
            "INNER JOIN project_member pm ON p.id = pm.project_id " +
            "WHERE p.tenant_id = #{tenantId} AND pm.user_id = #{userId} " +
            "ORDER BY p.created_at DESC")
    List<Project> selectByTenantAndUser(@Param("tenantId") String tenantId, @Param("userId") String userId);
}
