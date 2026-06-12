package com.academyfollowup.api.message;

public record BulkSentMessageRecipient(
        String studentId,
        String classId,
        MessageRecipientType recipientType,
        String phone,
        String providerMessageId
) {
    public static BulkSentMessageRecipient from(BulkMessageRecipient recipient, String providerMessageId) {
        return new BulkSentMessageRecipient(
                recipient.studentId(),
                recipient.classId(),
                recipient.recipientType(),
                recipient.phone(),
                providerMessageId
        );
    }
}
