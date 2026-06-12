package com.academyfollowup.api.management;

public record StudentSchedulePayload(
        String scheduleId,
        String studentId,
        String classId,
        String teacherId,
        String scheduleType,
        String scheduleDate,
        int dayOfWeek,
        String startTime,
        String endTime,
        String subject,
        String title,
        String memo,
        boolean isActive,
        String sourceFollowupId
) {
}
