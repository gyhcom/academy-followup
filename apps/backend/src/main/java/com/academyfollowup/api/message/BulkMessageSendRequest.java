package com.academyfollowup.api.message;

public record BulkMessageSendRequest(
        String targetType,
        String classId,
        String gradeLabel,
        String recipientType,
        String messageBody,
        Boolean excludeDuplicateRecipients
) {
}
