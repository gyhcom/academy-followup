package com.academyfollowup.api.message;

import com.academyfollowup.api.global.security.WorkspaceContext;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/messages")
public class MessagePreviewController {

    private final MessagePreviewService messagePreviewService;

    public MessagePreviewController(MessagePreviewService messagePreviewService) {
        this.messagePreviewService = messagePreviewService;
    }

    @PostMapping("/preview")
    public MessagePreviewResponse preview(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestBody MessagePreviewRequest request
    ) {
        return messagePreviewService.preview(workspaceContext, request);
    }
}
