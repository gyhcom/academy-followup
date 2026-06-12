package com.academyfollowup.api.message;

import java.util.Arrays;

public enum MessageRecipientType {
    PARENT("parent"),
    STUDENT("student"),
    BOTH("both");

    private final String value;

    MessageRecipientType(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public static MessageRecipientType from(String value) {
        return Arrays.stream(values())
                .filter(type -> type.value.equals(value))
                .findFirst()
                .orElse(null);
    }
}
