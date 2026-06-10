package com.academyfollowup.api.report;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ReportSummaryResponse(ReportSummary summary) {
    public record ReportSummary(
            String range,
            String label,
            Attendance attendance,
            Messages messages,
            Students students,
            Audit audit
    ) {
    }

    public record Attendance(
            int total,
            int present,
            int late,
            int absent,
            @JsonProperty("needsCheck") int needsCheck,
            int makeup,
            int pending
    ) {
    }

    public record Messages(
            int followups,
            int logs,
            @JsonProperty("dryRun") int dryRun,
            int sent,
            int failed,
            int sms,
            int lms,
            @JsonProperty("overLimit") int overLimit
    ) {
    }

    public record Students(
            int active,
            int classes,
            @JsonProperty("missingSchedule") int missingSchedule
    ) {
    }

    public record Audit(int count) {
    }
}
