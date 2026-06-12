package com.academyfollowup.api.management;

public record BulkScheduleResponse(
        int totalStudents,
        int totalTargets,
        int dayCount,
        int insertedCount,
        int skippedCount,
        String message
) {
}
