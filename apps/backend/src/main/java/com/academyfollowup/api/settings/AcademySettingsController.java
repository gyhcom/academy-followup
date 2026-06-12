package com.academyfollowup.api.settings;

import com.academyfollowup.api.global.security.WorkspaceContext;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/academy-settings")
public class AcademySettingsController {

    private final AcademySettingsService academySettingsService;

    public AcademySettingsController(AcademySettingsService academySettingsService) {
        this.academySettingsService = academySettingsService;
    }

    @PatchMapping
    public AcademySettingsResponse saveSettings(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestBody AcademySettingsRequest request
    ) {
        return academySettingsService.saveSettings(workspaceContext, request);
    }
}
