package com.flowlet.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.flowlet.entity.FlowDefinition;
import com.flowlet.entity.SimhashRecord;
import com.flowlet.mapper.FlowDefinitionMapper;
import com.flowlet.mapper.SimhashRecordMapper;
import com.flowlet.util.JiebaUtil;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import com.google.common.hash.Hashing;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

/**
 * Simhash 计算与检索服务
 */
@Service
@RequiredArgsConstructor
public class SimhashService {

    private static final int DEFAULT_TOP_KEYWORDS = 50;
    private static final int BUCKET_SEGMENTS = 8;

    private final SimhashRecordMapper simhashRecordMapper;
    private final FlowDefinitionMapper flowDefinitionMapper;

    @Data
    @AllArgsConstructor
    public static class SimhashResult {
        private long simhash;
        private int tokenCount;
    }

    @Data
    @AllArgsConstructor
    public static class SimhashMatch {
        private String contentId;
        private String flowId;
        private int distance;
        private long simhash;
        private String contentType;
    }

    public SimhashResult calculateSimhash(String text) {
        if (text == null || text.isBlank()) {
            return new SimhashResult(0L, 0);
        }

        List<JiebaUtil.Keyword> keywords = JiebaUtil.analyze(text, DEFAULT_TOP_KEYWORDS);
        if (keywords.isEmpty()) {
            long fallback = murmurHash64(text);
            return new SimhashResult(fallback, 1);
        }

        double[] bitCounts = new double[64];
        for (JiebaUtil.Keyword keyword : keywords) {
            long hash = murmurHash64(keyword.getName());
            double weight = keyword.getTfidfvalue();
            if (weight <= 0) {
                weight = 1.0;
            }
            for (int i = 0; i < 64; i++) {
                if (((hash >>> i) & 1L) == 1L) {
                    bitCounts[i] += weight;
                } else {
                    bitCounts[i] -= weight;
                }
            }
        }

        long result = 0L;
        for (int i = 0; i < 64; i++) {
            if (bitCounts[i] >= 0) {
                result |= (1L << i);
            }
        }
        return new SimhashResult(result, keywords.size());
    }

    public int[] buildBuckets(long simhash) {
        int[] buckets = new int[BUCKET_SEGMENTS];
        for (int i = 0; i < BUCKET_SEGMENTS; i++) {
            buckets[i] = (int) ((simhash >>> (i * 8)) & 0xFF);
        }
        return buckets;
    }

    public SimhashRecord saveOrUpdate(
            String projectId,
            String flowId,
            String contentId,
            String contentType,
            long simhash,
            int tokenCount
    ) {
        if (projectId == null || contentId == null) {
            throw new IllegalArgumentException("projectId 或 contentId 不能为空");
        }

        SimhashRecord existing = simhashRecordMapper.selectOne(
                new LambdaQueryWrapper<SimhashRecord>()
                        .eq(SimhashRecord::getProjectId, projectId)
                        .eq(SimhashRecord::getContentId, contentId)
                        .last("LIMIT 1")
        );

        int[] buckets = buildBuckets(simhash);

        SimhashRecord record = existing != null ? existing : new SimhashRecord();
        record.setProjectId(projectId);
        record.setFlowId(flowId);
        record.setContentId(contentId);
        record.setContentType(contentType);
        record.setSimhash64(simhash);
        record.setTokenCount(tokenCount);
        record.setBucket0(buckets[0]);
        record.setBucket1(buckets[1]);
        record.setBucket2(buckets[2]);
        record.setBucket3(buckets[3]);
        record.setBucket4(buckets[4]);
        record.setBucket5(buckets[5]);
        record.setBucket6(buckets[6]);
        record.setBucket7(buckets[7]);

        if (existing == null) {
            simhashRecordMapper.insert(record);
        } else {
            simhashRecordMapper.updateById(record);
        }

        return record;
    }

    public List<SimhashMatch> searchMatches(
            String projectId,
            List<String> flowIds,
            long simhash,
            int maxDistance
    ) {
        if (projectId == null) {
            return Collections.emptyList();
        }

        List<String> allowedFlowIds = filterAllowedFlowIds(projectId, flowIds);
        if (allowedFlowIds.isEmpty()) {
            return Collections.emptyList();
        }

        int[] buckets = buildBuckets(simhash);

        LambdaQueryWrapper<SimhashRecord> wrapper = new LambdaQueryWrapper<SimhashRecord>()
                .eq(SimhashRecord::getProjectId, projectId)
                .in(SimhashRecord::getFlowId, allowedFlowIds)
                .and(w -> w.eq(SimhashRecord::getBucket0, buckets[0])
                        .or().eq(SimhashRecord::getBucket1, buckets[1])
                        .or().eq(SimhashRecord::getBucket2, buckets[2])
                        .or().eq(SimhashRecord::getBucket3, buckets[3])
                        .or().eq(SimhashRecord::getBucket4, buckets[4])
                        .or().eq(SimhashRecord::getBucket5, buckets[5])
                        .or().eq(SimhashRecord::getBucket6, buckets[6])
                        .or().eq(SimhashRecord::getBucket7, buckets[7]));

        List<SimhashRecord> candidates = simhashRecordMapper.selectList(wrapper);
        if (candidates.isEmpty()) {
            return Collections.emptyList();
        }

        List<SimhashMatch> matches = new ArrayList<>();
        for (SimhashRecord record : candidates) {
            if (record.getSimhash64() == null) {
                continue;
            }
            int distance = hammingDistance(simhash, record.getSimhash64());
            if (distance < maxDistance) {
                matches.add(new SimhashMatch(
                        record.getContentId(),
                        record.getFlowId(),
                        distance,
                        record.getSimhash64(),
                        record.getContentType()
                ));
            }
        }

        matches.sort((a, b) -> Integer.compare(a.getDistance(), b.getDistance()));
        return matches;
    }

    private List<String> filterAllowedFlowIds(String projectId, List<String> flowIds) {
        if (flowIds == null || flowIds.isEmpty()) {
            return Collections.emptyList();
        }
        Set<String> flowIdSet = new HashSet<>(flowIds);
        List<FlowDefinition> flows = flowDefinitionMapper.selectList(
                new LambdaQueryWrapper<FlowDefinition>()
                        .eq(FlowDefinition::getProjectId, projectId)
                        .in(FlowDefinition::getId, flowIdSet)
        );
        List<String> allowed = new ArrayList<>();
        for (FlowDefinition flow : flows) {
            allowed.add(flow.getId());
        }
        return allowed;
    }

    public static int hammingDistance(long a, long b) {
        return Long.bitCount(a ^ b);
    }

    public static String toHexString(long value) {
        return String.format("%016x", value);
    }

    private static long murmurHash64(String input) {
        Charset utf8 = StandardCharsets.UTF_8;
        if (input == null || utf8 == null) {
            return 0;
        }
        return Hashing.murmur3_128()
                .hashString(input, utf8)
                .asLong();
    }
}
