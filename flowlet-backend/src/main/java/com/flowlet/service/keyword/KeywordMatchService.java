package com.flowlet.service.keyword;

import com.flowlet.entity.KeywordGroup;
import com.flowlet.entity.KeywordLibrary;
import com.flowlet.entity.KeywordTerm;
import com.flowlet.enums.KeywordActionLevel;
import com.flowlet.enums.KeywordMatchMode;
import com.flowlet.mapper.KeywordGroupMapper;
import com.flowlet.mapper.KeywordGroupTermMapper;
import com.flowlet.mapper.KeywordLibraryMapper;
import com.flowlet.mapper.KeywordTermMapper;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import cn.hutool.extra.pinyin.PinyinUtil;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * 关键词匹配服务
 */
@Service
@RequiredArgsConstructor
public class KeywordMatchService {

    private final KeywordLibraryMapper keywordLibraryMapper;
    private final KeywordTermMapper keywordTermMapper;
    private final KeywordGroupMapper keywordGroupMapper;
    private final KeywordGroupTermMapper keywordGroupTermMapper;
    private final Map<String, CacheEntry> matcherCache = new ConcurrentHashMap<>();

    public MatchResult match(String libraryId, String text) {
        if (libraryId == null || libraryId.isBlank()) {
            return MatchResult.empty();
        }

        KeywordLibrary library = keywordLibraryMapper.selectById(libraryId);
        if (library == null || Boolean.FALSE.equals(library.getEnabled())) {
            return MatchResult.empty();
        }

        String normalizedText = normalize(text);
        if (normalizedText.isBlank()) {
            return MatchResult.empty();
        }

        CacheEntry cacheEntry = getOrBuildCache(library);
        if (cacheEntry.termMap.isEmpty()) {
            return MatchResult.empty();
        }

        Set<String> matchedTermIds = new HashSet<>();
        Set<String> matchedSubterms = new HashSet<>();
        if (cacheEntry.normalMatcher != null) {
            matchedTermIds.addAll(cacheEntry.normalMatcher.match(normalizedText));
        }
        if (cacheEntry.comboSubtermMatcher != null) {
            matchedSubterms.addAll(cacheEntry.comboSubtermMatcher.match(normalizedText));
        }
        if (cacheEntry.pinyinMatcher != null) {
            matchedTermIds.addAll(
                    cacheEntry.pinyinMatcher.match(normalize(toPinyin(normalizedText)))
            );
        }
        if (!cacheEntry.comboTermParts.isEmpty()) {
            for (Map.Entry<String, List<String>> entry : cacheEntry.comboTermParts.entrySet()) {
                if (matchedSubterms.containsAll(entry.getValue())) {
                    matchedTermIds.add(entry.getKey());
                }
            }
        }

        if (matchedTermIds.isEmpty()) {
            return MatchResult.empty();
        }

        if (cacheEntry.groups.isEmpty()) {
            return MatchResult.empty();
        }

        List<MatchedGroup> matchedGroups = new ArrayList<>();
        for (KeywordGroup group : cacheEntry.groups) {
            List<String> groupTermIds = cacheEntry.groupTermIds.getOrDefault(group.getId(), List.of());
            if (groupTermIds.isEmpty()) {
                continue;
            }
            if (!matchesGroup(groupTermIds, matchedTermIds)) {
                continue;
            }
            List<String> terms = groupTermIds.stream()
                    .filter(matchedTermIds::contains)
                    .map(termId -> cacheEntry.termMap.get(termId))
                    .filter(Objects::nonNull)
                    .map(KeywordTerm::getTerm)
                    .distinct()
                    .collect(Collectors.toList());

            MatchedGroup matchedGroup = new MatchedGroup();
            matchedGroup.setGroupId(group.getId());
            matchedGroup.setName(group.getName());
            matchedGroup.setActionLevel(group.getActionLevel());
            matchedGroup.setPriority(group.getPriority());
            matchedGroup.setMatchedTermIds(groupTermIds.stream()
                    .filter(matchedTermIds::contains)
                    .collect(Collectors.toList()));
            matchedGroup.setMatchedTerms(terms);
            matchedGroups.add(matchedGroup);
        }

        if (matchedGroups.isEmpty()) {
            return MatchResult.empty();
        }

        KeywordActionLevel selectedLevel = null;
        int selectedSeverity = -1;
        int selectedPriority = Integer.MIN_VALUE;
        for (MatchedGroup group : matchedGroups) {
            KeywordActionLevel level = KeywordActionLevel.valueOf(safeUpper(group.getActionLevel()));
            int severity = KeywordActionLevel.severity(level);
            int priority = group.getPriority() != null ? group.getPriority() : 0;
            if (severity > selectedSeverity || (severity == selectedSeverity && priority > selectedPriority)) {
                selectedSeverity = severity;
                selectedPriority = priority;
                selectedLevel = level;
            }
        }

        Set<String> matchedTerms = new LinkedHashSet<>();
        for (MatchedGroup group : matchedGroups) {
            matchedTerms.addAll(group.getMatchedTerms());
        }

        MatchResult result = new MatchResult();
        result.setHit(true);
        result.setActionLevel(selectedLevel != null ? selectedLevel.name() : null);
        result.setMatchedGroups(matchedGroups);
        result.setMatchedTerms(new ArrayList<>(matchedTerms));
        return result;
    }

    private CacheEntry getOrBuildCache(KeywordLibrary library) {
        String libraryId = library.getId();
        LocalDateTime updatedAt = library.getUpdatedAt();
        CacheEntry cached = matcherCache.get(libraryId);
        if (cached != null && Objects.equals(updatedAt, cached.updatedAt)) {
            return cached;
        }
        synchronized (this) {
            CacheEntry current = matcherCache.get(libraryId);
            if (current != null && Objects.equals(updatedAt, current.updatedAt)) {
                return current;
            }
            CacheEntry rebuilt = buildCache(libraryId, updatedAt);
            matcherCache.put(libraryId, rebuilt);
            return rebuilt;
        }
    }

    private CacheEntry buildCache(String libraryId, LocalDateTime updatedAt) {
        List<KeywordTerm> allTerms = keywordTermMapper.selectByLibraryId(libraryId, null).stream()
                .filter(term -> Boolean.TRUE.equals(term.getEnabled()))
                .collect(Collectors.toList());

        Map<String, KeywordTerm> termMap = allTerms.stream()
                .collect(Collectors.toMap(KeywordTerm::getId, term -> term));

        Map<String, String> normalPatterns = new HashMap<>();
        Map<String, String> pinyinPatterns = new HashMap<>();
        Map<String, List<String>> comboTermParts = new HashMap<>();
        Set<String> comboSubterms = new LinkedHashSet<>();

        for (KeywordTerm term : allTerms) {
            String normalizedTerm = normalize(term.getTerm());
            if (normalizedTerm.isBlank()) {
                continue;
            }
            String mode = safeUpper(term.getMatchMode());
            if (KeywordMatchMode.PINYIN.name().equals(mode)) {
                String pinyin = normalize(toPinyin(normalizedTerm));
                if (!pinyin.isBlank()) {
                    pinyinPatterns.put(pinyin, term.getId());
                }
            } else if (KeywordMatchMode.COMBO.name().equals(mode)) {
                List<String> parts = splitCombo(normalizedTerm);
                if (!parts.isEmpty()) {
                    comboTermParts.put(term.getId(), parts);
                    comboSubterms.addAll(parts);
                }
            } else {
                normalPatterns.put(normalizedTerm, term.getId());
            }
        }

        AhoCorasickMatcher normalMatcher =
                normalPatterns.isEmpty() ? null : AhoCorasickMatcher.build(normalPatterns);
        AhoCorasickMatcher pinyinMatcher =
                pinyinPatterns.isEmpty() ? null : AhoCorasickMatcher.build(pinyinPatterns);
        AhoCorasickMatcher comboSubtermMatcher = null;
        if (!comboSubterms.isEmpty()) {
            Map<String, String> comboPatternMap = new HashMap<>();
            for (String part : comboSubterms) {
                comboPatternMap.put(part, part);
            }
            comboSubtermMatcher = AhoCorasickMatcher.build(comboPatternMap);
        }

        List<KeywordGroup> groups = keywordGroupMapper.selectByLibraryId(libraryId, null).stream()
                .filter(group -> Boolean.TRUE.equals(group.getEnabled()))
                .collect(Collectors.toList());
        Map<String, List<String>> groupTermIds = new HashMap<>();
        for (KeywordGroup group : groups) {
            groupTermIds.put(group.getId(), keywordGroupTermMapper.selectTermIdsByGroupId(group.getId()));
        }

        CacheEntry entry = new CacheEntry();
        entry.updatedAt = updatedAt;
        entry.normalMatcher = normalMatcher;
        entry.pinyinMatcher = pinyinMatcher;
        entry.comboSubtermMatcher = comboSubtermMatcher;
        entry.comboTermParts = comboTermParts;
        entry.termMap = termMap;
        entry.groups = groups;
        entry.groupTermIds = groupTermIds;
        return entry;
    }

    private boolean matchesGroup(List<String> groupTermIds, Set<String> matchedTermIds) {
        for (String termId : groupTermIds) {
            if (matchedTermIds.contains(termId)) {
                return true;
            }
        }
        return false;
    }

    private String normalize(String text) {
        if (text == null) {
            return "";
        }
        return text.toLowerCase(Locale.ROOT).trim();
    }

    private String toPinyin(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        try {
            return PinyinUtil.getPinyin(text, "");
        } catch (Exception ignored) {
            return text;
        }
    }

    private String safeUpper(String value) {
        return value == null ? "" : value.toUpperCase(Locale.ROOT);
    }

    private List<String> splitCombo(String normalizedTerm) {
        String[] parts = normalizedTerm.split(",");
        List<String> result = new ArrayList<>();
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isBlank()) {
                result.add(trimmed);
            }
        }
        return result;
    }

    @Data
    public static class MatchResult {
        private boolean hit;
        private String actionLevel;
        private List<MatchedGroup> matchedGroups;
        private List<String> matchedTerms;

        public static MatchResult empty() {
            MatchResult result = new MatchResult();
            result.setHit(false);
            result.setMatchedGroups(Collections.emptyList());
            result.setMatchedTerms(Collections.emptyList());
            return result;
        }
    }

    @Data
    public static class MatchedGroup {
        private String groupId;
        private String name;
        private String actionLevel;
        private Integer priority;
        private List<String> matchedTermIds;
        private List<String> matchedTerms;
    }

    private static class CacheEntry {
        private LocalDateTime updatedAt;
        private AhoCorasickMatcher normalMatcher;
        private AhoCorasickMatcher pinyinMatcher;
        private AhoCorasickMatcher comboSubtermMatcher;
        private Map<String, List<String>> comboTermParts = new HashMap<>();
        private Map<String, KeywordTerm> termMap = new HashMap<>();
        private List<KeywordGroup> groups = new ArrayList<>();
        private Map<String, List<String>> groupTermIds = new HashMap<>();
    }
}
