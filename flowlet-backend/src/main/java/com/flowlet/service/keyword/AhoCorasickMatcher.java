package com.flowlet.service.keyword;

import java.util.*;

/**
 * 简化版 Aho-Corasick 多模式匹配器
 */
public class AhoCorasickMatcher {

    private final Node root = new Node();

    public static AhoCorasickMatcher build(Map<String, String> patterns) {
        AhoCorasickMatcher matcher = new AhoCorasickMatcher();
        for (Map.Entry<String, String> entry : patterns.entrySet()) {
            matcher.addPattern(entry.getKey(), entry.getValue());
        }
        matcher.buildFailureLinks();
        return matcher;
    }

    private void addPattern(String pattern, String termId) {
        Node node = root;
        for (int i = 0; i < pattern.length(); i++) {
            char c = pattern.charAt(i);
            node = node.children.computeIfAbsent(c, key -> new Node());
        }
        node.outputs.add(termId);
    }

    private void buildFailureLinks() {
        Queue<Node> queue = new ArrayDeque<>();
        for (Node child : root.children.values()) {
            child.fail = root;
            queue.add(child);
        }
        while (!queue.isEmpty()) {
            Node current = queue.poll();
            for (Map.Entry<Character, Node> entry : current.children.entrySet()) {
                char c = entry.getKey();
                Node next = entry.getValue();
                Node fail = current.fail;
                while (fail != null && !fail.children.containsKey(c)) {
                    fail = fail.fail;
                }
                next.fail = (fail == null) ? root : fail.children.get(c);
                next.outputs.addAll(next.fail.outputs);
                queue.add(next);
            }
        }
    }

    public Set<String> match(String text) {
        Set<String> matches = new HashSet<>();
        Node node = root;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            while (node != root && !node.children.containsKey(c)) {
                node = node.fail;
            }
            node = node.children.getOrDefault(c, root);
            if (!node.outputs.isEmpty()) {
                matches.addAll(node.outputs);
            }
        }
        return matches;
    }

    private static class Node {
        private final Map<Character, Node> children = new HashMap<>();
        private Node fail;
        private final List<String> outputs = new ArrayList<>();
    }
}
