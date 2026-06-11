package com.academyfollowup.api.message;

import com.academyfollowup.api.global.security.WorkspaceContext;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bulk-messages")
public class BulkMessagePreviewController {

    private final BulkMessagePreviewService bulkMessagePreviewService;

    public BulkMessagePreviewController(BulkMessagePreviewService bulkMessagePreviewService) {
        this.bulkMessagePreviewService = bulkMessagePreviewService;
    }

    @PostMapping("/preview")
    public BulkMessagePreviewResponse preview(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestBody BulkMessagePreviewRequest request
    ) {
        return bulkMessagePreviewService.preview(workspaceContext, request);
    }
}
