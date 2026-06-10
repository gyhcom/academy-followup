package com.academyfollowup.api.audit;

import com.academyfollowup.api.global.security.WorkspaceContext;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/audit")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping("/logs")
    public AuditLogsResponse logs(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestParam(name = "limit", defaultValue = "20") int limit
    ) {
        return new AuditLogsResponse(auditLogService.findRecentLogs(workspaceContext, limit));
    }
}
