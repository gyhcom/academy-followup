package com.academyfollowup.api.report;

public enum ReportRange {
    TODAY("today", "오늘"),
    SEVEN_DAYS("7d", "최근 7일"),
    MONTH("month", "이번 달");

    private final String value;
    private final String label;

    ReportRange(String value, String label) {
        this.value = value;
        this.label = label;
    }

    public String value() {
        return value;
    }

    public String label() {
        return label;
    }

    public static ReportRange from(String value) {
        for (ReportRange range : values()) {
            if (range.value.equals(value)) {
                return range;
            }
        }

        return TODAY;
    }
}
