package com.academyfollowup.api.message;

import org.springframework.stereotype.Component;

@Component
public class MessageLengthMetricsCalculator {

    private static final int SMS_BYTE_LIMIT = 90;
    private static final int LMS_BYTE_LIMIT = 2000;

    public MessageLengthMetrics calculate(String message) {
        String normalized = normalize(message);
        int byteCount = countBytes(normalized);
        return new MessageLengthMetrics(
                normalized.codePointCount(0, normalized.length()),
                byteCount,
                transportType(byteCount),
                hasEmojiOrSupplementaryCharacter(normalized),
                byteCount > LMS_BYTE_LIMIT
        );
    }

    private String normalize(String message) {
        if (message == null) {
            return "";
        }

        return message.replace("\r\n", "\n").replace("\r", "\n").trim();
    }

    private int countBytes(String message) {
        return message.codePoints()
                .map(codePoint -> {
                    if (codePoint <= 0x7f) {
                        return 1;
                    }

                    if (codePoint > 0xffff) {
                        return 4;
                    }

                    return 2;
                })
                .sum();
    }

    private boolean hasEmojiOrSupplementaryCharacter(String message) {
        return message.codePoints().anyMatch(codePoint -> codePoint > 0xffff);
    }

    private String transportType(int byteCount) {
        if (byteCount <= SMS_BYTE_LIMIT) {
            return "sms";
        }

        if (byteCount <= LMS_BYTE_LIMIT) {
            return "lms";
        }

        return "too_long";
    }
}
