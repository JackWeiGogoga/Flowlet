package com.flowlet.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.flowlet.entity.VectorStoreProvider;
import org.apache.ibatis.annotations.Mapper;

/**
 * 向量存储提供方配置 Mapper
 */
@Mapper
public interface VectorStoreProviderMapper extends BaseMapper<VectorStoreProvider> {
}
