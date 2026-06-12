package com.academyfollowup.api.message;

public record MessageLengthMetrics(
        int charCount,
        int byteCount,
        String transportType,
        boolean hasEmoji,
        boolean isOverLimit
) {
}
