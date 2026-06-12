package com.academyfollowup.api.message;

import com.academyfollowup.api.global.security.WorkspaceContext;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bulk-messages")
public class BulkMessageSendController {

    private final BulkMessageSendService bulkMessageSendService;

    public BulkMessageSendController(BulkMessageSendService bulkMessageSendService) {
        this.bulkMessageSendService = bulkMessageSendService;
    }

    @PostMapping("/send")
    public BulkMessageSendResponse send(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestBody BulkMessageSendRequest request
    ) {
        return bulkMessageSendService.send(workspaceContext, request);
    }
}
