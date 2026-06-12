package com.academyfollowup.api.attendance;

import java.util.Arrays;

public enum AttendanceStatus {
    PENDING("pending"),
    PRESENT("present"),
    LATE("late"),
    ABSENT("absent"),
    MAKEUP("makeup"),
    EXCUSED("excused"),
    NEEDS_CHECK("needs_check");

    private final String value;

    AttendanceStatus(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public boolean hasArrived() {
        return this == PRESENT || this == LATE || this == MAKEUP;
    }

    public static AttendanceStatus from(String value) {
        return Arrays.stream(values())
                .filter(status -> status.value.equals(value))
                .findFirst()
                .orElse(null);
    }
}
