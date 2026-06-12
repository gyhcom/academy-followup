package com.academyfollowup.api.message;

public record BulkMessageSendResponse(
        boolean dryRun,
        String message,
        int targetStudentCount,
        int candidateRecipientCount,
        int recipientCount,
        int duplicateExcludedCount
) {
    public static BulkMessageSendResponse from(
            boolean dryRun,
            String message,
            BulkMessagePreviewResponse preview
    ) {
        return new BulkMessageSendResponse(
                dryRun,
                message,
                preview.targetStudentCount(),
                preview.candidateRecipientCount(),
                preview.recipientCount(),
                preview.duplicateExcludedCount()
        );
    }
}
