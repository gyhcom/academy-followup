package com.academyfollowup.api.message;

public record BulkMessageRecipient(
        String studentId,
        String classId,
        MessageRecipientType recipientType,
        String phone
) {
    public BulkMessageRecipient withPhone(String phone) {
        return new BulkMessageRecipient(studentId, classId, recipientType, phone);
    }
}
