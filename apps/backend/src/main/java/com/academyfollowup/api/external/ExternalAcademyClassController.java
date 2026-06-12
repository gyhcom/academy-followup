package com.academyfollowup.api.external;

import com.academyfollowup.api.global.security.WorkspaceContext;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/external-academy-classes")
public class ExternalAcademyClassController {

    private final ExternalAcademyClassService externalAcademyClassService;

    public ExternalAcademyClassController(ExternalAcademyClassService externalAcademyClassService) {
        this.externalAcademyClassService = externalAcademyClassService;
    }

    @PostMapping
    public ExternalAcademyClassResponse handle(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestBody ExternalAcademyClassRequest request
    ) {
        return externalAcademyClassService.handle(workspaceContext, request);
    }
}
