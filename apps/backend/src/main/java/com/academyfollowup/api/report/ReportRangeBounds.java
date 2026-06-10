package com.academyfollowup.api.report;

public record ReportRangeBounds(
        String startDate,
        String endDate,
        String startDateTime,
        String endDateTime,
        String label
) {
}
