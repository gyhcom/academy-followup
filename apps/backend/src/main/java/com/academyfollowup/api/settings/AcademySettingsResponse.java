package com.academyfollowup.api.settings;

public record AcademySettingsResponse(Settings settings) {

    public record Settings(
            String academyName,
            String senderName,
            String senderPhone,
            boolean smsDryRun,
            int duplicateGuardMinutes,
            boolean allowAssistantSend
    ) {
    }
}
