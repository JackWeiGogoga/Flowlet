package com.flowlet.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.flowlet.entity.KeywordGroup;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 关键词规则组 Mapper
 */
@Mapper
public interface KeywordGroupMapper extends BaseMapper<KeywordGroup> {

    @Select("<script>" +
            "SELECT * FROM keyword_group WHERE library_id = #{libraryId} " +
            "<if test='keyword != null and keyword != \"\"'> " +
            "AND (LOWER(name) LIKE '%' || LOWER(#{keyword}) || '%' " +
            "OR LOWER(IFNULL(description, '')) LIKE '%' || LOWER(#{keyword}) || '%')" +
            "</if> " +
            "ORDER BY priority DESC, created_at DESC" +
            "</script>")
    List<KeywordGroup> selectByLibraryId(@Param("libraryId") String libraryId,
                                         @Param("keyword") String keyword);

    @Select("SELECT COUNT(*) FROM keyword_group WHERE library_id = #{libraryId} AND name = #{name} " +
            "AND (#{excludeId} IS NULL OR id != #{excludeId})")
    int countByName(@Param("libraryId") String libraryId,
                    @Param("name") String name,
                    @Param("excludeId") String excludeId);
}
