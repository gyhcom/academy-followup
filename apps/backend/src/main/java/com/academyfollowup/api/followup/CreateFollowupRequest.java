package com.academyfollowup.api.followup;

public record CreateFollowupRequest(
        String studentId,
        String reason,
        String messageBody,
        String attendanceRecordId,
        String recipientType
) {
}
