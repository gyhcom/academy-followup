package com.academyfollowup.api.management;

public record StudentScheduleRequest(
        String scheduleId,
        String studentId,
        String classId,
        String teacherId,
        String scheduleType,
        String scheduleDate,
        Object dayOfWeek,
        String startTime,
        String endTime,
        String subject,
        String title,
        String memo,
        Boolean isActive,
        String sourceFollowupId
) {
}
