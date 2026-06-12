package com.academyfollowup.api.message;

public record MessagePreviewResponse(
        String templateId,
        String title,
        String body,
        MessageLengthMetrics metrics,
        String reason,
        StudentItem student
) {
    public record StudentItem(String id, String name) {
    }
}
