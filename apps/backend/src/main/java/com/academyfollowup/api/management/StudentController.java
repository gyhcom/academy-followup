package com.academyfollowup.api.management;

import com.academyfollowup.api.global.security.WorkspaceContext;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final ManagementService managementService;

    public StudentController(ManagementService managementService) {
        this.managementService = managementService;
    }

    @PostMapping
    public StudentResponse create(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestBody StudentRequest request
    ) {
        return new StudentResponse(managementService.createStudent(workspaceContext, request));
    }

    @PatchMapping
    public StudentResponse update(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestBody StudentRequest request
    ) {
        return new StudentResponse(managementService.updateStudent(workspaceContext, request));
    }
}
