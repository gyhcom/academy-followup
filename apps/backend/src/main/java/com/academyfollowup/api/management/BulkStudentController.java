package com.academyfollowup.api.management;

import com.academyfollowup.api.global.security.WorkspaceContext;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/students/bulk")
public class BulkStudentController {

    private final ManagementBulkService managementBulkService;

    public BulkStudentController(ManagementBulkService managementBulkService) {
        this.managementBulkService = managementBulkService;
    }

    @PostMapping
    public BulkStudentResponse create(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestBody BulkStudentRequest request
    ) {
        return managementBulkService.createStudents(workspaceContext, request);
    }
}
