package com.flowlet.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.flowlet.dto.FlowExecutionVO;
import com.flowlet.entity.FlowExecution;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;

@Mapper
public interface FlowExecutionMapper extends BaseMapper<FlowExecution> {

    /**
     * 分页查询执行记录（关联流程名称）
     * @param projectId 项目ID
     * @param flowId 流程ID
     * @param status 执行状态
     * @param startTime 开始时间（筛选 started_at >= startTime）
     * @param endTime 结束时间（筛选 started_at <= endTime）
     * @param includeDebug 是否包含调试执行记录，默认不包含
     */
    Page<FlowExecutionVO> selectPageWithFlowName(
            Page<FlowExecutionVO> page,
            @Param("projectId") String projectId,
            @Param("flowId") String flowId,
            @Param("status") String status,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            @Param("includeDebug") boolean includeDebug
    );
}
