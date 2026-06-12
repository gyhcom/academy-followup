package com.academyfollowup.api.management;

import java.util.List;

public record BulkScheduleRequest(
        String classId,
        String teacherId,
        String scheduleType,
        Integer dayOfWeek,
        List<Integer> dayOfWeeks,
        String startTime,
        String endTime,
        String subject,
        String title,
        String memo
) {
}
