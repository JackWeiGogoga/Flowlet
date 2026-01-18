package com.flowlet.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.flowlet.entity.AsyncCallback;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface AsyncCallbackMapper extends BaseMapper<AsyncCallback> {

    /**
     * 根据 callbackKey 查找回调记录
     */
    @Select("SELECT * FROM async_callback WHERE callback_key = #{callbackKey}")
    AsyncCallback findByCallbackKey(String callbackKey);
}
