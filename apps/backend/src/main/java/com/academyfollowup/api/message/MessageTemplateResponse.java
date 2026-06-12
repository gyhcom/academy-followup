package com.academyfollowup.api.message;

import java.util.List;

public record MessageTemplateResponse(List<MessageTemplateItem> templates) {

    public record MessageTemplateItem(
            String id,
            String reason,
            String reasonLabel,
            String title,
            String body,
            boolean isActive
    ) {
    }
}
