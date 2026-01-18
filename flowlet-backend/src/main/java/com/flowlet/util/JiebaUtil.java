package com.flowlet.util;

import com.huaban.analysis.jieba.JiebaSegmenter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
public final class JiebaUtil {

    private static final Map<String, Double> IDF_MAP = new HashMap<>();
    private static final Set<String> STOP_WORDS_SET = new HashSet<>();
    private static final ThreadLocal<JiebaSegmenter> SEGMENTER =
            ThreadLocal.withInitial(JiebaSegmenter::new);
    private static double idfMedian = 1.0;

    static {
        try {
            loadStopWords(STOP_WORDS_SET, new ClassPathResource("jieba/stop_words.txt").getInputStream());
            loadIdfMap(IDF_MAP, new ClassPathResource("jieba/idf.txt").getInputStream());
        } catch (Exception e) {
            log.warn("初始化 jieba 资源失败", e);
        }
    }

    private JiebaUtil() {
    }

    /**
     *
     * 功能描述: tfidf分析方法
     *
     * @param content 需要分析的文本/文档内容
     * @param top 需要返回的tfidf值最高的N个关键词，若超过content本身含有的词语上限数目，则默认返回全部
     * @return 关键词
     */

    public static List<Keyword> analyze(String content, int top) {
        List<Keyword> keywordList = new ArrayList<>();
        Map<String, Double> tfMap = getTf(content);
        for (Map.Entry<String, Double> entry : tfMap.entrySet()) {
            String word = entry.getKey();
            Double tfValue = entry.getValue();
            Double idfValue = IDF_MAP.getOrDefault(word, idfMedian);
            keywordList.add(new Keyword(word, idfValue * tfValue));
        }

        Collections.sort(keywordList);

        if (top > 0 && keywordList.size() > top) {
            return new ArrayList<>(keywordList.subList(0, top));
        }
        return keywordList;
    }

    /**
     *
     * 功能描述: tf值计算公式 tf=N(i,j)/(sum(N(k,j) for all k))
     * N(i,j)表示词语Ni在该文档d（content）中出现的频率，sum(N(k,j))代表所有词语在文档d中出现的频率之和
     *
     * @param content 待分析文本
     * @return tf集合
     */
    private static Map<String, Double> getTf(String content) {
        Map<String, Double> tfMap = new HashMap<>();
        if (content == null || content.isBlank()) {
            return tfMap;
        }
        JiebaSegmenter segmenter = SEGMENTER.get();
        List<String> segments = segmenter.sentenceProcess(content);
        Map<String, Integer> freqMap = new HashMap<>();

        int wordSum = 0;
        for (String segment : segments) {
            //停用词不予考虑，单字词不予考虑
            if (!STOP_WORDS_SET.contains(segment) && segment.length() > 1) {
                wordSum++;
                freqMap.put(segment, freqMap.getOrDefault(segment, 0) + 1);
            }
        }

        // 计算double型的tf值
        if (wordSum == 0) {
            return tfMap;
        }
        for (Map.Entry<String, Integer> entry : freqMap.entrySet()) {
            tfMap.put(entry.getKey(), entry.getValue() * 1.0 / wordSum);
        }

        return tfMap;
    }

    /**
     * 默认jieba分词的停词表
     * url:https://github.com/yanyiwu/nodejieba/blob/master/dict/stop_words.utf8
     *
     * @param set 停止词集合
     * @param in 停止词输入流
     */
    private static void loadStopWords(Set<String> set, InputStream in) {
        try (BufferedReader bufr = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            String line;
            while ((line = bufr.readLine()) != null) {
                String value = line.trim();
                if (!value.isEmpty()) {
                    set.add(value);
                }
            }
        } catch (Exception e) {
            log.warn("加载停用词失败", e);
        }
    }

    /**
     * idf值本来需要语料库来自己按照公式进行计算，不过jieba分词已经提供了一份很好的idf字典，所以默认直接使用jieba分词的idf字典
     * url:https://raw.githubusercontent.com/yanyiwu/nodejieba/master/dict/idf.utf8
     *
     * @param map idf集合
     * @param in idf输入流
     */
    private static void loadIdfMap(Map<String, Double> map, InputStream in) {
        try (BufferedReader bufr = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            String line;
            while ((line = bufr.readLine()) != null) {
                String[] kv = line.trim().split(" ");
                if (kv.length != 2) {
                    continue;
                }
                map.put(kv[0], Double.parseDouble(kv[1]));
            }

            // 计算idf值的中位数
            List<Double> idfList = new ArrayList<>(map.values());
            Collections.sort(idfList);
            if (!idfList.isEmpty()) {
                idfMedian = idfList.get(idfList.size() / 2);
            }
        } catch (Exception e) {
            log.warn("加载 idf 词典失败", e);
        }
    }

    public static class Keyword implements Comparable<Keyword> {
        /**
         * tfidfvalue
         */
        private final double tfidfvalue;
        /**
         * name
         */
        private final String name;

        public Keyword(String name, double tfidfvalue) {
            this.name = name;
            // tfidf值只保留3位小数
            this.tfidfvalue = (double) Math.round(tfidfvalue * 10000) / 10000;
        }

        public double getTfidfvalue() {
            return tfidfvalue;
        }

        public String getName() {
            return name;
        }

        /**
         * 为了在返回tdidf分析结果时，可以按照值的从大到小顺序返回，故实现Comparable接口
         */
        @Override
        public int compareTo(Keyword o) {
            if (this.tfidfvalue - o.tfidfvalue > 0) {
                return -1;
            } else if (this.tfidfvalue - o.tfidfvalue < 0) {
                return 1;
            } else {
                return 0;
            }
            //return this.tfidfvalue-o.tfidfvalue>0?-1:1;
        }

        /**
         * 重写hashcode方法，计算方式与原生String的方法相同
         */
        @Override
        public int hashCode() {
            final int PRIME = 31;
            int result = 1;
            result = PRIME * result + ((name == null) ? 0 : name.hashCode());
            long temp;
            temp = Double.doubleToLongBits(tfidfvalue);
            result = PRIME * result + (int) (temp ^ (temp >>> 32));
            return result;
        }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) {
                return true;
            }
            if (obj == null) {
                return false;
            }
            if (getClass() != obj.getClass()) {
                return false;
            }
            Keyword other = (Keyword) obj;
            if (name == null) {
                if (other.name != null) {
                    return false;
                }
            } else if (!name.equals(other.name)) {
                return false;
            }
            return true;
        }

    }
}
