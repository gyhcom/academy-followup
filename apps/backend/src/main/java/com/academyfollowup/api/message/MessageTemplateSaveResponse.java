package com.academyfollowup.api.message;

public record MessageTemplateSaveResponse(TemplateItem template) {

    public record TemplateItem(
            String id,
            String reason,
            String title,
            String body,
            boolean isActive
    ) {
    }
}
