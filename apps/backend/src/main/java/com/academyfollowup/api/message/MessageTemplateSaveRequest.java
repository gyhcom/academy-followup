package com.academyfollowup.api.message;

public record MessageTemplateSaveRequest(
        String reason,
        String title,
        String body,
        Boolean isActive
) {
}
