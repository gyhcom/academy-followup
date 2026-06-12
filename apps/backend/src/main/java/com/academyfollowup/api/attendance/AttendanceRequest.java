package com.academyfollowup.api.attendance;

public record AttendanceRequest(
        String studentId,
        String classId,
        String attendanceDate,
        String scheduledStartTime,
        String scheduledEndTime,
        String status,
        String note
) {
}
