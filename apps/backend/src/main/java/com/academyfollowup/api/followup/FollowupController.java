package com.academyfollowup.api.followup;

import com.academyfollowup.api.global.security.WorkspaceContext;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/followups")
public class FollowupController {

    private final FollowupService followupService;

    public FollowupController(FollowupService followupService) {
        this.followupService = followupService;
    }

    @GetMapping
    public FollowupHistoryResponse history(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestParam(name = "studentId") String studentId
    ) {
        return new FollowupHistoryResponse(followupService.findHistory(workspaceContext, studentId));
    }

    @PostMapping
    public CreateFollowupResponse create(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestBody CreateFollowupRequest request
    ) {
        return new CreateFollowupResponse(followupService.create(workspaceContext, request));
    }
}
