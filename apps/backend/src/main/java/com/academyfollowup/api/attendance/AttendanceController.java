package com.academyfollowup.api.attendance;

import com.academyfollowup.api.global.security.WorkspaceContext;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @GetMapping
    public AttendanceResponse records(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestParam(name = "date") String date
    ) {
        return AttendanceResponse.records(attendanceService.findRecords(workspaceContext, date));
    }

    @PatchMapping
    public AttendanceResponse savePatch(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestBody AttendanceRequest request
    ) {
        return AttendanceResponse.record(attendanceService.save(workspaceContext, request));
    }

    @PostMapping
    public AttendanceResponse savePost(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestBody AttendanceRequest request
    ) {
        return AttendanceResponse.record(attendanceService.save(workspaceContext, request));
    }
}
