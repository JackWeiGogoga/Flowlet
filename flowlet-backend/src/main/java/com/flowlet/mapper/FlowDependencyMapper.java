package com.flowlet.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.flowlet.entity.FlowDependency;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 流程依赖关系Mapper
 */
@Mapper
public interface FlowDependencyMapper extends BaseMapper<FlowDependency> {

    /**
     * 根据流程ID获取所有依赖的流程ID
     */
    @Select("SELECT dependent_flow_id FROM flow_dependency WHERE flow_id = #{flowId}")
    List<String> selectDependentFlowIds(@Param("flowId") String flowId);

    /**
     * 获取依赖某个流程的所有流程ID（即哪些流程调用了该流程）
     */
    @Select("SELECT flow_id FROM flow_dependency WHERE dependent_flow_id = #{dependentFlowId}")
    List<String> selectDependentByFlowIds(@Param("dependentFlowId") String dependentFlowId);
}
