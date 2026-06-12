package com.academyfollowup.api.report;

public enum ReportExportType {
    STUDENTS("students"),
    ATTENDANCE("attendance"),
    MESSAGES("messages"),
    AUDIT("audit");

    private final String value;

    ReportExportType(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public static ReportExportType from(String value) {
        for (ReportExportType type : values()) {
            if (type.value.equals(value)) {
                return type;
            }
        }

        throw new IllegalArgumentException("내보내기 종류가 올바르지 않습니다.");
    }
}
