package com.academyfollowup.api.management;

import com.academyfollowup.api.global.security.WorkspaceContext;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student-schedules/bulk")
public class BulkScheduleController {

    private final ManagementBulkService managementBulkService;

    public BulkScheduleController(ManagementBulkService managementBulkService) {
        this.managementBulkService = managementBulkService;
    }

    @PostMapping
    public BulkScheduleResponse create(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestBody BulkScheduleRequest request
    ) {
        return managementBulkService.createClassSchedules(workspaceContext, request);
    }
}
