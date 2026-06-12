package com.academyfollowup.api.message;

public record BulkMessagePreviewResponse(
        int targetStudentCount,
        int candidateRecipientCount,
        int recipientCount,
        int duplicateExcludedCount
) {
}
