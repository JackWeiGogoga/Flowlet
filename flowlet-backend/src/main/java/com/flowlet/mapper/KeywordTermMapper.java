package com.flowlet.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.flowlet.entity.KeywordTerm;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 关键词词条 Mapper
 */
@Mapper
public interface KeywordTermMapper extends BaseMapper<KeywordTerm> {

    @Select("<script>" +
            "SELECT * FROM keyword_term WHERE library_id = #{libraryId} " +
            "<if test='keyword != null and keyword != \"\"'> " +
            "AND LOWER(term) LIKE '%' || LOWER(#{keyword}) || '%'" +
            "</if> " +
            "ORDER BY created_at DESC" +
            "</script>")
    List<KeywordTerm> selectByLibraryId(@Param("libraryId") String libraryId,
                                        @Param("keyword") String keyword);

    @Select("SELECT COUNT(*) FROM keyword_term WHERE library_id = #{libraryId} AND term = #{term} " +
            "AND match_mode = #{matchMode} AND (#{excludeId} IS NULL OR id != #{excludeId})")
    int countByTerm(@Param("libraryId") String libraryId,
                    @Param("term") String term,
                    @Param("matchMode") String matchMode,
                    @Param("excludeId") String excludeId);

    @Select("SELECT COUNT(*) FROM keyword_term WHERE library_id = #{libraryId} AND match_mode = 'PINYIN' " +
            "AND pinyin = #{pinyin} AND (#{excludeId} IS NULL OR id != #{excludeId})")
    int countByPinyin(@Param("libraryId") String libraryId,
                      @Param("pinyin") String pinyin,
                      @Param("excludeId") String excludeId);

    @Select("<script>" +
            "SELECT * FROM keyword_term WHERE id IN " +
            "<foreach item='id' collection='ids' open='(' separator=',' close=')'>#{id}</foreach>" +
            "</script>")
    List<KeywordTerm> selectByIds(@Param("ids") List<String> ids);
}
