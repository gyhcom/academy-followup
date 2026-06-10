package com.academyfollowup.api.audit;

import java.util.List;

public record AuditLogsResponse(List<AuditLogItem> logs) {

    public record AuditLogItem(
            String id,
            String actorName,
            String action,
            String entityType,
            String entityId,
            String summary,
            String createdAt
    ) {
    }
}
