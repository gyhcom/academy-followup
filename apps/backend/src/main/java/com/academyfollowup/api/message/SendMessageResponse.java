package com.academyfollowup.api.message;

public record SendMessageResponse(
        boolean dryRun,
        String message,
        String recipientPhone,
        int recipientCount,
        String followupId,
        Boolean duplicate,
        Integer duplicateGuardMinutes
) {
    public static SendMessageResponse sent(
            boolean dryRun,
            String message,
            String recipientPhone,
            int recipientCount,
            String followupId
    ) {
        return new SendMessageResponse(dryRun, message, recipientPhone, recipientCount, followupId, null, null);
    }
}
