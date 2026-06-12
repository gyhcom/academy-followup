package com.academyfollowup.api.external;

public record ExternalAcademyClassRequest(
        String action,
        String studentId,
        String enrollmentId,
        String academyName,
        String classTitle,
        String subject,
        String scheduleDate,
        Integer dayOfWeek,
        String startTime,
        String endTime,
        String memo
) {
}
