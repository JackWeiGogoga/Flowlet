package com.flowlet.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.flowlet.entity.ProjectMember;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 项目成员 Mapper
 */
@Mapper
public interface ProjectMemberMapper extends BaseMapper<ProjectMember> {

    /**
     * 查询项目的所有成员
     */
    @Select("SELECT * FROM project_member WHERE project_id = #{projectId}")
    List<ProjectMember> selectByProjectId(@Param("projectId") String projectId);

    /**
     * 查询用户在项目中的成员信息
     */
    @Select("SELECT * FROM project_member WHERE project_id = #{projectId} AND user_id = #{userId}")
    ProjectMember selectByProjectAndUser(@Param("projectId") String projectId, @Param("userId") String userId);

    /**
     * 检查用户是否是项目成员
     */
    @Select("SELECT COUNT(*) > 0 FROM project_member WHERE project_id = #{projectId} AND user_id = #{userId}")
    boolean existsByProjectAndUser(@Param("projectId") String projectId, @Param("userId") String userId);

    /**
     * 查询用户所属的所有项目ID
     */
    @Select("SELECT project_id FROM project_member WHERE user_id = #{userId}")
    List<String> selectProjectIdsByUserId(@Param("userId") String userId);

    /**
     * 删除项目的所有成员
     */
    @Delete("DELETE FROM project_member WHERE project_id = #{projectId}")
    int deleteByProjectId(@Param("projectId") String projectId);
}
