package com.flowlet.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.flowlet.entity.EnumDefinition;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 枚举定义 Mapper
 */
@Mapper
public interface EnumDefinitionMapper extends BaseMapper<EnumDefinition> {

    /**
     * 查询项目下所有枚举
     */
    @Select("SELECT * FROM enum_definition WHERE project_id = #{projectId} ORDER BY name")
    List<EnumDefinition> selectByProject(@Param("projectId") String projectId);

    /**
     * 检查同一项目内名称是否唯一
     */
    @Select("SELECT COUNT(*) FROM enum_definition WHERE project_id = #{projectId} AND name = #{name} " +
            "AND (#{excludeId} IS NULL OR id != #{excludeId})")
    int countByName(@Param("projectId") String projectId,
                    @Param("name") String name,
                    @Param("excludeId") String excludeId);
}
