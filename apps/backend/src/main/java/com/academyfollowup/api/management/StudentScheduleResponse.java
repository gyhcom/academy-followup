package com.academyfollowup.api.management;

public record StudentScheduleResponse(ScheduleItem schedule) {

    public record ScheduleItem(
            String id,
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
}
