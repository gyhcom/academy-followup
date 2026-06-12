package com.academyfollowup.api.attendance;

public record AttendancePayload(
        String studentId,
        String classId,
        String attendanceDate,
        String scheduledStartTime,
        String scheduledEndTime,
        AttendanceStatus status,
        String note
) {
}
