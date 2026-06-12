package com.academyfollowup.api.message;

public record BulkMessagePreviewRequest(
        String targetType,
        String classId,
        String gradeLabel,
        String recipientType,
        Boolean excludeDuplicateRecipients
) {
}
