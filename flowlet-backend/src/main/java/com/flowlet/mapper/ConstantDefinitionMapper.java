package com.flowlet.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.flowlet.entity.ConstantDefinition;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 常量定义 Mapper
 */
@Mapper
public interface ConstantDefinitionMapper extends BaseMapper<ConstantDefinition> {

    /**
     * 查询项目级常量
     */
    @Select("SELECT * FROM constant_definition WHERE project_id = #{projectId} AND (flow_id IS NULL OR flow_id = '') ORDER BY name")
    List<ConstantDefinition> selectProjectLevelConstants(@Param("projectId") String projectId);

    /**
     * 查询流程级常量
     */
    @Select("SELECT * FROM constant_definition WHERE flow_id = #{flowId} ORDER BY name")
    List<ConstantDefinition> selectFlowLevelConstants(@Param("flowId") String flowId);

    /**
     * 查询项目下所有常量（包括项目级和流程级）
     */
    @Select("SELECT * FROM constant_definition WHERE project_id = #{projectId} ORDER BY flow_id, name")
    List<ConstantDefinition> selectAllByProject(@Param("projectId") String projectId);

    /**
     * 检查同一作用域内名称是否唯一
     */
    @Select("SELECT COUNT(*) FROM constant_definition WHERE project_id = #{projectId} AND " +
            "((#{flowId} IS NULL AND (flow_id IS NULL OR flow_id = '')) OR flow_id = #{flowId}) AND " +
            "name = #{name} AND (#{excludeId} IS NULL OR id != #{excludeId})")
    int countByName(@Param("projectId") String projectId,
                    @Param("flowId") String flowId,
                    @Param("name") String name,
                    @Param("excludeId") String excludeId);
}
