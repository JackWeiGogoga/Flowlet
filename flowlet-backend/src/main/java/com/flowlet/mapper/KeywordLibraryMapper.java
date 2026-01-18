package com.flowlet.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.flowlet.entity.KeywordLibrary;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

/**
 * 关键词库 Mapper
 */
@Mapper
public interface KeywordLibraryMapper extends BaseMapper<KeywordLibrary> {

    @Select("<script>" +
            "SELECT * FROM keyword_library WHERE project_id = #{projectId} " +
            "<if test='keyword != null and keyword != \"\"'> " +
            "AND (LOWER(name) LIKE '%' || LOWER(#{keyword}) || '%' " +
            "OR LOWER(IFNULL(description, '')) LIKE '%' || LOWER(#{keyword}) || '%')" +
            "</if> " +
            "ORDER BY created_at DESC" +
            "</script>")
    List<KeywordLibrary> selectByProjectId(@Param("projectId") String projectId,
                                           @Param("keyword") String keyword);

    @Select("SELECT COUNT(*) FROM keyword_library WHERE project_id = #{projectId} AND name = #{name} " +
            "AND (#{excludeId} IS NULL OR id != #{excludeId})")
    int countByName(@Param("projectId") String projectId,
                    @Param("name") String name,
                    @Param("excludeId") String excludeId);

    @Update("UPDATE keyword_library SET updated_at = CURRENT_TIMESTAMP WHERE id = #{id}")
    int touch(@Param("id") String id);
}
