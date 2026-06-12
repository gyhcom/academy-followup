package com.academyfollowup.api.followup;

public record CreateFollowupResponse(FollowupCreated followup) {

    public record FollowupCreated(
            String id,
            String status,
            String createdAt,
            String attendanceRecordId
    ) {
    }
}
