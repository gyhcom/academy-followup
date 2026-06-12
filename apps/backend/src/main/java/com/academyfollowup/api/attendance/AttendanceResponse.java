package com.academyfollowup.api.attendance;

import java.util.List;

public record AttendanceResponse(List<AttendanceRecordItem> records, AttendanceRecordItem record) {

    public static AttendanceResponse records(List<AttendanceRecordItem> records) {
        return new AttendanceResponse(records, null);
    }

    public static AttendanceResponse record(AttendanceRecordItem record) {
        return new AttendanceResponse(null, record);
    }

    public record AttendanceRecordItem(
            String id,
            String studentId,
            String classId,
            String teacherId,
            String attendanceDate,
            String scheduledStartTime,
            String scheduledEndTime,
            String status,
            String checkedAt,
            String arrivedAt,
            String note,
            String followupId,
            String followupStatus,
            String followupSentAt
    ) {
    }
}
