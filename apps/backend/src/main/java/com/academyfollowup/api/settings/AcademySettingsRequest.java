package com.academyfollowup.api.settings;

public record AcademySettingsRequest(
        String academyName,
        String senderName,
        String senderPhone,
        Boolean smsDryRun,
        Integer duplicateGuardMinutes,
        Boolean allowAssistantSend
) {
}
