package com.academyfollowup.api.report;

import org.springframework.stereotype.Component;

@Component
public class MessageLengthCounter {

    private static final int SMS_BYTE_LIMIT = 90;
    private static final int LMS_BYTE_LIMIT = 2000;

    public TransportType getTransportType(String message) {
        int byteCount = countBytes(normalize(message));

        if (byteCount <= SMS_BYTE_LIMIT) {
            return TransportType.SMS;
        }

        if (byteCount <= LMS_BYTE_LIMIT) {
            return TransportType.LMS;
        }

        return TransportType.OVER_LIMIT;
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

    public enum TransportType {
        SMS,
        LMS,
        OVER_LIMIT
    }
}
