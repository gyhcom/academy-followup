package com.academyfollowup.api.followup;

import java.util.Arrays;

public enum FollowupRecipientType {
    PARENT("parent"),
    STUDENT("student"),
    BOTH("both");

    private final String value;

    FollowupRecipientType(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public static FollowupRecipientType from(String value) {
        return Arrays.stream(values())
                .filter(type -> type.value.equals(value))
                .findFirst()
                .orElse(null);
    }
}
