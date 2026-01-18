package com.flowlet.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.flowlet.entity.DataStructure;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

/**
 * 数据结构 Mapper
 */
@Mapper
public interface DataStructureMapper extends BaseMapper<DataStructure> {
    
    /**
     * 查询项目级结构
     */
    @Select("SELECT * FROM data_structure WHERE project_id = #{projectId} AND (flow_id IS NULL OR flow_id = '') ORDER BY name")
    List<DataStructure> selectProjectLevelStructures(@Param("projectId") String projectId);
    
    /**
     * 查询流程级结构
     */
    @Select("SELECT * FROM data_structure WHERE flow_id = #{flowId} ORDER BY name")
    List<DataStructure> selectFlowLevelStructures(@Param("flowId") String flowId);
    
    /**
     * 查询项目下所有结构（包括项目级和流程级）
     */
    @Select("SELECT * FROM data_structure WHERE project_id = #{projectId} ORDER BY flow_id, name")
    List<DataStructure> selectAllByProject(@Param("projectId") String projectId);
    
    /**
     * 检查同一作用域内名称是否唯一
     */
    @Select("SELECT COUNT(*) FROM data_structure WHERE project_id = #{projectId} AND " +
            "((#{flowId} IS NULL AND (flow_id IS NULL OR flow_id = '')) OR flow_id = #{flowId}) AND " +
            "name = #{name} AND (#{excludeId} IS NULL OR id != #{excludeId})")
    int countByName(@Param("projectId") String projectId, 
                    @Param("flowId") String flowId, 
                    @Param("name") String name,
                    @Param("excludeId") String excludeId);
    
    /**
     * 增加引用计数
     */
    @Update("UPDATE data_structure SET usage_count = COALESCE(usage_count, 0) + 1 WHERE id = #{id}")
    int incrementUsageCount(@Param("id") String id);
    
    /**
     * 减少引用计数
     */
    @Update("UPDATE data_structure SET usage_count = CASE WHEN COALESCE(usage_count, 0) > 0 THEN usage_count - 1 ELSE 0 END WHERE id = #{id}")
    int decrementUsageCount(@Param("id") String id);
}
