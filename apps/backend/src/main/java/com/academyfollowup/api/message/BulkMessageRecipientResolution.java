package com.academyfollowup.api.message;

import java.util.List;

public record BulkMessageRecipientResolution(
        int targetStudentCount,
        List<BulkMessageRecipient> candidateRecipients,
        List<BulkMessageRecipient> recipients
) {
    public BulkMessagePreviewResponse preview() {
        return new BulkMessagePreviewResponse(
                targetStudentCount,
                candidateRecipients.size(),
                recipients.size(),
                candidateRecipients.size() - recipients.size()
        );
    }
}
