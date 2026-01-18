package com.flowlet.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.flowlet.entity.KeywordGroupTerm;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 关键词规则组-词条关联 Mapper
 */
@Mapper
public interface KeywordGroupTermMapper extends BaseMapper<KeywordGroupTerm> {

    @Select("SELECT term_id FROM keyword_group_term WHERE group_id = #{groupId}")
    List<String> selectTermIdsByGroupId(@Param("groupId") String groupId);

    @Select("SELECT group_id FROM keyword_group_term WHERE term_id = #{termId}")
    List<String> selectGroupIdsByTermId(@Param("termId") String termId);
}
