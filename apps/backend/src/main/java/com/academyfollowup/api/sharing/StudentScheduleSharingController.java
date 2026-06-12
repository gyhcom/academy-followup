package com.academyfollowup.api.sharing;

import com.academyfollowup.api.global.security.WorkspaceContext;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student-schedule-sharing")
public class StudentScheduleSharingController {

    private final StudentScheduleSharingService sharingService;

    public StudentScheduleSharingController(StudentScheduleSharingService sharingService) {
        this.sharingService = sharingService;
    }

    @GetMapping
    public StudentScheduleSharingResponse get(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestParam String studentId
    ) {
        return sharingService.getLinks(workspaceContext, studentId);
    }

    @PostMapping
    public StudentScheduleSharingResponse post(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestBody StudentScheduleSharingRequest request
    ) {
        return sharingService.handle(workspaceContext, request);
    }
}
