package com.flowlet.enums;

/**
 * 关键词处置等级
 */
public enum KeywordActionLevel {
    DELETE,
    REVIEW_BEFORE_PUBLISH,
    PUBLISH_BEFORE_REVIEW,
    TAG_ONLY;

    public static int severity(KeywordActionLevel level) {
        if (level == null) {
            return -1;
        }
        return switch (level) {
            case DELETE -> 4;
            case REVIEW_BEFORE_PUBLISH -> 3;
            case PUBLISH_BEFORE_REVIEW -> 2;
            case TAG_ONLY -> 1;
        };
    }
}
