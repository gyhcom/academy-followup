package com.academyfollowup.api.auth;

import com.academyfollowup.api.global.security.WorkspaceContext;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthContextController {

    @GetMapping("/context")
    public WorkspaceContext context(@AuthenticationPrincipal WorkspaceContext workspaceContext) {
        return workspaceContext;
    }
}
