package com.flowlet.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.flowlet.dto.keyword.KeywordGroupRequest;
import com.flowlet.dto.keyword.KeywordGroupResponse;
import com.flowlet.dto.keyword.KeywordLibraryRequest;
import com.flowlet.dto.keyword.KeywordLibraryResponse;
import com.flowlet.dto.keyword.KeywordTermRequest;
import com.flowlet.dto.keyword.KeywordTermResponse;
import com.flowlet.entity.KeywordGroup;
import com.flowlet.entity.KeywordGroupTerm;
import com.flowlet.entity.KeywordLibrary;
import com.flowlet.entity.KeywordTerm;
import com.flowlet.enums.KeywordActionLevel;
import com.flowlet.enums.KeywordGroupMatchMode;
import com.flowlet.enums.KeywordMatchMode;
import com.flowlet.mapper.KeywordGroupMapper;
import com.flowlet.mapper.KeywordGroupTermMapper;
import com.flowlet.mapper.KeywordLibraryMapper;
import com.flowlet.mapper.KeywordTermMapper;
import com.flowlet.security.TenantContext;
import com.flowlet.security.TenantContextHolder;
import cn.hutool.extra.pinyin.PinyinUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 关键词库管理服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KeywordLibraryService {

    private final KeywordLibraryMapper keywordLibraryMapper;
    private final KeywordTermMapper keywordTermMapper;
    private final KeywordGroupMapper keywordGroupMapper;
    private final KeywordGroupTermMapper keywordGroupTermMapper;

    public List<KeywordLibraryResponse> listLibraries(String projectId, String keyword) {
        return keywordLibraryMapper.selectByProjectId(projectId, normalizeKeyword(keyword)).stream()
                .map(this::toLibraryResponse)
                .collect(Collectors.toList());
    }

    public List<KeywordLibraryResponse> listLibraries(String projectId) {
        return listLibraries(projectId, null);
    }

    @Transactional
    public KeywordLibraryResponse createLibrary(String projectId,
                                                KeywordLibraryRequest request,
                                                String userId) {
        validateLibraryRequest(request);
        if (keywordLibraryMapper.countByName(projectId, request.getName(), null) > 0) {
            throw new IllegalArgumentException("关键词库名称已存在: " + request.getName());
        }

        KeywordLibrary entity = new KeywordLibrary();
        entity.setProjectId(projectId);
        entity.setName(request.getName().trim());
        entity.setDescription(request.getDescription());
        entity.setEnabled(resolveEnabled(request.getEnabled()));
        entity.setCreatedBy(userId);
        entity.setCreatedByName(resolveCreatorName());

        keywordLibraryMapper.insert(entity);
        log.info("创建关键词库: projectId={}, name={}", projectId, entity.getName());
        return toLibraryResponse(entity);
    }

    @Transactional
    public KeywordLibraryResponse updateLibrary(String id,
                                                String projectId,
                                                KeywordLibraryRequest request) {
        validateLibraryRequest(request);
        KeywordLibrary entity = keywordLibraryMapper.selectById(id);
        if (entity == null) {
            throw new IllegalArgumentException("关键词库不存在: " + id);
        }
        if (!Objects.equals(entity.getProjectId(), projectId)) {
            throw new IllegalArgumentException("关键词库不属于当前项目");
        }
        if (keywordLibraryMapper.countByName(projectId, request.getName(), id) > 0) {
            throw new IllegalArgumentException("关键词库名称已存在: " + request.getName());
        }

        entity.setName(request.getName().trim());
        entity.setDescription(request.getDescription());
        entity.setEnabled(resolveEnabled(request.getEnabled()));
        keywordLibraryMapper.updateById(entity);
        return toLibraryResponse(entity);
    }

    @Transactional
    public void deleteLibrary(String id) {
        KeywordLibrary library = keywordLibraryMapper.selectById(id);
        if (library == null) {
            return;
        }

        List<KeywordGroup> groups = keywordGroupMapper.selectByLibraryId(id, null);
        for (KeywordGroup group : groups) {
            deleteGroupTerms(group.getId());
        }
        keywordGroupMapper.delete(new QueryWrapper<KeywordGroup>().eq("library_id", id));
        keywordTermMapper.delete(new QueryWrapper<KeywordTerm>().eq("library_id", id));
        keywordLibraryMapper.deleteById(id);
        log.info("删除关键词库: id={}, name={}", id, library.getName());
    }

    public List<KeywordTermResponse> listTerms(String libraryId, String keyword) {
        List<KeywordTerm> terms = keywordTermMapper.selectByLibraryId(libraryId, normalizeKeyword(keyword));
        if (terms.isEmpty()) {
            return Collections.emptyList();
        }

        Map<String, List<String>> termGroups = new HashMap<>();
        for (KeywordTerm term : terms) {
            termGroups.put(term.getId(), keywordGroupTermMapper.selectGroupIdsByTermId(term.getId()));
        }

        return terms.stream()
                .map(term -> toTermResponse(term, termGroups.getOrDefault(term.getId(), List.of())))
                .collect(Collectors.toList());
    }

    public List<KeywordTermResponse> listTerms(String libraryId) {
        return listTerms(libraryId, null);
    }

    @Transactional
    public KeywordTermResponse createTerm(String libraryId, KeywordTermRequest request, String userId) {
        KeywordLibrary library = keywordLibraryMapper.selectById(libraryId);
        if (library == null) {
            throw new IllegalArgumentException("关键词库不存在");
        }
        validateTermRequest(request);

        String matchMode = resolveTermMatchMode(request.getMatchMode());
        String pinyin = ensureNoDuplicatePinyin(libraryId, null, matchMode, request.getTerm());
        if (keywordTermMapper.countByTerm(libraryId, request.getTerm().trim(), matchMode, null) > 0) {
            throw new IllegalArgumentException("关键词已存在: " + request.getTerm());
        }

        KeywordTerm term = new KeywordTerm();
        term.setLibraryId(libraryId);
        term.setTerm(request.getTerm().trim());
        term.setMatchMode(matchMode);
        term.setPinyin(pinyin);
        term.setEnabled(resolveEnabled(request.getEnabled()));
        term.setCreatedBy(userId);
        term.setCreatedByName(resolveCreatorName());
        keywordTermMapper.insert(term);
        replaceTermGroups(term.getId(), libraryId, request.getGroupIds());
        touchLibrary(libraryId);
        return toTermResponse(term, safeIds(request.getGroupIds()));
    }

    @Transactional
    public KeywordTermResponse updateTerm(String libraryId, String id, KeywordTermRequest request) {
        KeywordTerm term = keywordTermMapper.selectById(id);
        if (term == null) {
            throw new IllegalArgumentException("关键词不存在");
        }
        if (!Objects.equals(term.getLibraryId(), libraryId)) {
            throw new IllegalArgumentException("关键词不属于当前关键词库");
        }
        validateTermRequest(request);

        String matchMode = resolveTermMatchMode(request.getMatchMode());
        String pinyin = ensureNoDuplicatePinyin(libraryId, id, matchMode, request.getTerm());
        if (keywordTermMapper.countByTerm(libraryId, request.getTerm().trim(), matchMode, id) > 0) {
            throw new IllegalArgumentException("关键词已存在: " + request.getTerm());
        }

        term.setTerm(request.getTerm().trim());
        term.setMatchMode(matchMode);
        term.setPinyin(pinyin);
        term.setEnabled(resolveEnabled(request.getEnabled()));
        keywordTermMapper.updateById(term);
        replaceTermGroups(term.getId(), libraryId, request.getGroupIds());
        touchLibrary(libraryId);
        return toTermResponse(term, safeIds(request.getGroupIds()));
    }

    @Transactional
    public void deleteTerm(String libraryId, String id) {
        KeywordTerm term = keywordTermMapper.selectById(id);
        if (term == null) {
            return;
        }
        if (!Objects.equals(term.getLibraryId(), libraryId)) {
            throw new IllegalArgumentException("关键词不属于当前关键词库");
        }
        keywordGroupTermMapper.delete(new QueryWrapper<KeywordGroupTerm>().eq("term_id", id));
        keywordTermMapper.deleteById(id);
        touchLibrary(libraryId);
    }

    public List<KeywordGroupResponse> listGroups(String libraryId, String keyword) {
        List<KeywordGroup> groups = keywordGroupMapper.selectByLibraryId(libraryId, normalizeKeyword(keyword));
        if (groups.isEmpty()) {
            return Collections.emptyList();
        }

        Map<String, List<String>> groupTerms = new HashMap<>();
        for (KeywordGroup group : groups) {
            groupTerms.put(group.getId(), keywordGroupTermMapper.selectTermIdsByGroupId(group.getId()));
        }

        return groups.stream()
                .map(group -> toGroupResponse(group, groupTerms.getOrDefault(group.getId(), List.of())))
                .collect(Collectors.toList());
    }

    public List<KeywordGroupResponse> listGroups(String libraryId) {
        return listGroups(libraryId, null);
    }

    @Transactional
    public KeywordGroupResponse createGroup(String libraryId,
                                            KeywordGroupRequest request,
                                            String userId) {
        KeywordLibrary library = keywordLibraryMapper.selectById(libraryId);
        if (library == null) {
            throw new IllegalArgumentException("关键词库不存在");
        }
        validateGroupRequest(request);

        if (keywordGroupMapper.countByName(libraryId, request.getName(), null) > 0) {
            throw new IllegalArgumentException("规则组名称已存在: " + request.getName());
        }

        KeywordGroup group = new KeywordGroup();
        group.setLibraryId(libraryId);
        group.setName(request.getName().trim());
        group.setDescription(request.getDescription());
        group.setEnabled(resolveEnabled(request.getEnabled()));
        group.setMatchMode(resolveGroupMatchMode(null));
        group.setActionLevel(resolveActionLevel(request.getActionLevel()));
        group.setPriority(resolvePriority(request.getPriority()));
        group.setCreatedBy(userId);
        group.setCreatedByName(resolveCreatorName());
        keywordGroupMapper.insert(group);

        replaceGroupTerms(group.getId(), libraryId, request.getTermIds());
        touchLibrary(libraryId);

        return toGroupResponse(group, safeIds(request.getTermIds()));
    }

    @Transactional
    public KeywordGroupResponse updateGroup(String libraryId,
                                            String id,
                                            KeywordGroupRequest request) {
        KeywordGroup group = keywordGroupMapper.selectById(id);
        if (group == null) {
            throw new IllegalArgumentException("规则组不存在");
        }
        if (!Objects.equals(group.getLibraryId(), libraryId)) {
            throw new IllegalArgumentException("规则组不属于当前关键词库");
        }
        validateGroupRequest(request);

        if (keywordGroupMapper.countByName(libraryId, request.getName(), id) > 0) {
            throw new IllegalArgumentException("规则组名称已存在: " + request.getName());
        }

        group.setName(request.getName().trim());
        group.setDescription(request.getDescription());
        group.setEnabled(resolveEnabled(request.getEnabled()));
        group.setMatchMode(resolveGroupMatchMode(null));
        group.setActionLevel(resolveActionLevel(request.getActionLevel()));
        group.setPriority(resolvePriority(request.getPriority()));
        keywordGroupMapper.updateById(group);

        replaceGroupTerms(group.getId(), libraryId, request.getTermIds());
        touchLibrary(libraryId);

        return toGroupResponse(group, safeIds(request.getTermIds()));
    }

    @Transactional
    public void deleteGroup(String libraryId, String id) {
        KeywordGroup group = keywordGroupMapper.selectById(id);
        if (group == null) {
            return;
        }
        if (!Objects.equals(group.getLibraryId(), libraryId)) {
            throw new IllegalArgumentException("规则组不属于当前关键词库");
        }
        deleteGroupTerms(id);
        keywordGroupMapper.deleteById(id);
        touchLibrary(libraryId);
    }

    private void replaceGroupTerms(String groupId, String libraryId, List<String> termIds) {
        deleteGroupTerms(groupId);
        List<String> normalized = safeIds(termIds);
        if (normalized.isEmpty()) {
            return;
        }

        List<KeywordTerm> terms = keywordTermMapper.selectByIds(normalized);
        Set<String> validTermIds = terms.stream()
                .filter(term -> Objects.equals(term.getLibraryId(), libraryId))
                .map(KeywordTerm::getId)
                .collect(Collectors.toSet());
        for (String termId : normalized) {
            if (!validTermIds.contains(termId)) {
                continue;
            }
            KeywordGroupTerm relation = new KeywordGroupTerm();
            relation.setGroupId(groupId);
            relation.setTermId(termId);
            keywordGroupTermMapper.insert(relation);
        }
    }

    private void deleteGroupTerms(String groupId) {
        keywordGroupTermMapper.delete(new QueryWrapper<KeywordGroupTerm>().eq("group_id", groupId));
    }

    private void replaceTermGroups(String termId, String libraryId, List<String> groupIds) {
        keywordGroupTermMapper.delete(new QueryWrapper<KeywordGroupTerm>().eq("term_id", termId));
        List<String> normalized = safeIds(groupIds);
        if (normalized.isEmpty()) {
            return;
        }
        List<KeywordGroup> groups = keywordGroupMapper.selectBatchIds(normalized);
        Set<String> validGroupIds = groups.stream()
                .filter(group -> Objects.equals(group.getLibraryId(), libraryId))
                .map(KeywordGroup::getId)
                .collect(Collectors.toSet());
        for (String groupId : normalized) {
            if (!validGroupIds.contains(groupId)) {
                continue;
            }
            KeywordGroupTerm relation = new KeywordGroupTerm();
            relation.setGroupId(groupId);
            relation.setTermId(termId);
            keywordGroupTermMapper.insert(relation);
        }
    }

    private void touchLibrary(String libraryId) {
        keywordLibraryMapper.touch(libraryId);
    }

    private KeywordLibraryResponse toLibraryResponse(KeywordLibrary entity) {
        KeywordLibraryResponse response = new KeywordLibraryResponse();
        response.setId(entity.getId());
        response.setProjectId(entity.getProjectId());
        response.setName(entity.getName());
        response.setDescription(entity.getDescription());
        response.setEnabled(entity.getEnabled());
        response.setCreatedBy(entity.getCreatedBy());
        response.setCreatedByName(entity.getCreatedByName());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }

    private KeywordTermResponse toTermResponse(KeywordTerm entity, List<String> groupIds) {
        KeywordTermResponse response = new KeywordTermResponse();
        response.setId(entity.getId());
        response.setLibraryId(entity.getLibraryId());
        response.setTerm(entity.getTerm());
        response.setMatchMode(entity.getMatchMode());
        response.setEnabled(entity.getEnabled());
        response.setGroupIds(groupIds);
        response.setCreatedBy(entity.getCreatedBy());
        response.setCreatedByName(entity.getCreatedByName());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }

    private KeywordGroupResponse toGroupResponse(KeywordGroup entity, List<String> termIds) {
        KeywordGroupResponse response = new KeywordGroupResponse();
        response.setId(entity.getId());
        response.setLibraryId(entity.getLibraryId());
        response.setName(entity.getName());
        response.setDescription(entity.getDescription());
        response.setEnabled(entity.getEnabled());
        response.setActionLevel(entity.getActionLevel());
        response.setPriority(entity.getPriority());
        response.setTermIds(termIds);
        response.setCreatedBy(entity.getCreatedBy());
        response.setCreatedByName(entity.getCreatedByName());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }

    private void validateLibraryRequest(KeywordLibraryRequest request) {
        if (request == null || request.getName() == null || request.getName().isBlank()) {
            throw new IllegalArgumentException("关键词库名称不能为空");
        }
    }

    private void validateTermRequest(KeywordTermRequest request) {
        if (request == null || request.getTerm() == null || request.getTerm().isBlank()) {
            throw new IllegalArgumentException("关键词不能为空");
        }
        resolveTermMatchMode(request.getMatchMode());
    }

    private void validateGroupRequest(KeywordGroupRequest request) {
        if (request == null || request.getName() == null || request.getName().isBlank()) {
            throw new IllegalArgumentException("规则组名称不能为空");
        }
        resolveActionLevel(request.getActionLevel());
    }

    private Boolean resolveEnabled(Boolean enabled) {
        return enabled != null ? enabled : Boolean.TRUE;
    }

    private String resolveTermMatchMode(String matchMode) {
        if (matchMode == null || matchMode.isBlank()) {
            return KeywordMatchMode.NORMAL.name();
        }
        return KeywordMatchMode.valueOf(matchMode.toUpperCase(Locale.ROOT)).name();
    }

    private String ensureNoDuplicatePinyin(String libraryId,
                                           String excludeId,
                                           String matchMode,
                                           String term) {
        if (!KeywordMatchMode.PINYIN.name().equals(matchMode)) {
            return null;
        }
        if (term == null || term.isBlank()) {
            return null;
        }
        String targetPinyin = normalizePinyin(term);
        if (targetPinyin.isBlank()) {
            return null;
        }
        if (keywordTermMapper.countByPinyin(libraryId, targetPinyin, excludeId) > 0) {
            throw new IllegalArgumentException("拼音关键词已存在");
        }
        List<KeywordTerm> terms = keywordTermMapper.selectByLibraryId(libraryId, null);
        for (KeywordTerm existing : terms) {
            if (!KeywordMatchMode.PINYIN.name().equalsIgnoreCase(existing.getMatchMode())) {
                continue;
            }
            if (excludeId != null && excludeId.equals(existing.getId())) {
                continue;
            }
            String existingPinyin = existing.getPinyin();
            if (existingPinyin == null || existingPinyin.isBlank()) {
                existingPinyin = normalizePinyin(existing.getTerm());
                if (!existingPinyin.isBlank()) {
                    existing.setPinyin(existingPinyin);
                    keywordTermMapper.updateById(existing);
                }
            }
            if (!existingPinyin.isBlank() && existingPinyin.equals(targetPinyin)) {
                throw new IllegalArgumentException("拼音关键词已存在");
            }
        }
        return targetPinyin;
    }

    private String normalizePinyin(String value) {
        try {
            return PinyinUtil.getPinyin(value, "")
                    .toLowerCase(Locale.ROOT)
                    .replaceAll("[^a-z]", "");
        } catch (Exception ignored) {
            return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z]", "");
        }
    }

    private String resolveCreatorName() {
        TenantContext context = TenantContextHolder.getContext();
        if (context == null) {
            return null;
        }
        if (context.getFullName() != null && !context.getFullName().isBlank()) {
            return context.getFullName();
        }
        return context.getUsername();
    }

    private String resolveGroupMatchMode(String matchMode) {
        return KeywordGroupMatchMode.ANY.name();
    }

    private String resolveActionLevel(String actionLevel) {
        if (actionLevel == null || actionLevel.isBlank()) {
            return KeywordActionLevel.TAG_ONLY.name();
        }
        return KeywordActionLevel.valueOf(actionLevel.toUpperCase(Locale.ROOT)).name();
    }

    private Integer resolvePriority(Integer priority) {
        return priority != null ? priority : 0;
    }

    private List<String> safeIds(List<String> ids) {
        if (ids == null) {
            return Collections.emptyList();
        }
        return ids.stream()
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
    }

    private String normalizeKeyword(String keyword) {
        return (keyword == null || keyword.isBlank()) ? null : keyword.trim();
    }
}
