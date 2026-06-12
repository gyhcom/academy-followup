package com.academyfollowup.api.management;

import com.academyfollowup.api.global.security.WorkspaceContext;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student-schedules")
public class StudentScheduleController {

    private final ManagementService managementService;

    public StudentScheduleController(ManagementService managementService) {
        this.managementService = managementService;
    }

    @PostMapping
    public StudentScheduleResponse create(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestBody StudentScheduleRequest request
    ) {
        return new StudentScheduleResponse(managementService.createSchedule(workspaceContext, request));
    }

    @PatchMapping
    public StudentScheduleResponse update(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestBody StudentScheduleRequest request
    ) {
        return new StudentScheduleResponse(managementService.updateSchedule(workspaceContext, request));
    }
}
