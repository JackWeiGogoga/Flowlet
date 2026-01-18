package com.flowlet.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.flowlet.entity.ModelProvider;
import org.apache.ibatis.annotations.Mapper;

/**
 * 模型提供方配置 Mapper
 */
@Mapper
public interface ModelProviderMapper extends BaseMapper<ModelProvider> {
}

