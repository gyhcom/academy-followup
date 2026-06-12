package com.academyfollowup.api.message;

public record MessageRecipient(
        MessageRecipientType recipientType,
        String phone,
        String providerMessageId
) {
    public MessageRecipient withProviderMessageId(String providerMessageId) {
        return new MessageRecipient(recipientType, phone, providerMessageId);
    }
}
