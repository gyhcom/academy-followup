package com.academyfollowup.api.management;

import com.academyfollowup.api.global.security.WorkspaceContext;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/classes")
public class ClassController {

    private final ManagementService managementService;

    public ClassController(ManagementService managementService) {
        this.managementService = managementService;
    }

    @PostMapping
    public ClassResponse create(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestBody ClassRequest request
    ) {
        return new ClassResponse(managementService.createClass(workspaceContext, request));
    }

    @PatchMapping
    public ClassResponse update(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestBody ClassRequest request
    ) {
        return new ClassResponse(managementService.updateClass(workspaceContext, request));
    }
}
