package com.academyfollowup.api.message;

import com.academyfollowup.api.global.security.WorkspaceContext;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/message-templates")
public class MessageTemplateController {

    private final MessageTemplateService messageTemplateService;

    public MessageTemplateController(MessageTemplateService messageTemplateService) {
        this.messageTemplateService = messageTemplateService;
    }

    @GetMapping
    public MessageTemplateResponse getTemplates(@AuthenticationPrincipal WorkspaceContext workspaceContext) {
        return new MessageTemplateResponse(messageTemplateService.findTemplates(workspaceContext));
    }

    @PatchMapping
    public MessageTemplateSaveResponse saveTemplate(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestBody MessageTemplateSaveRequest request
    ) {
        return messageTemplateService.saveTemplate(workspaceContext, request);
    }
}
