package com.academyfollowup.api.followup;

import java.util.List;

public record FollowupHistoryResponse(List<FollowupHistoryItem> followups) {

    public record FollowupHistoryItem(
            String id,
            String reason,
            String messageBody,
            String recipientType,
            String status,
            String sentAt,
            String createdAt
    ) {
    }
}
