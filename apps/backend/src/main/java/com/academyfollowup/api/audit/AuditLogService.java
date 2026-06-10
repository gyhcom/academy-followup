package com.academyfollowup.api.audit;

import com.academyfollowup.api.global.security.WorkspaceContext;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuditLogService {

    private final SupabaseAuditLogClient auditLogClient;

    public AuditLogService(SupabaseAuditLogClient auditLogClient) {
        this.auditLogClient = auditLogClient;
    }

    public List<AuditLogsResponse.AuditLogItem> findRecentLogs(
            WorkspaceContext workspaceContext,
            int requestedLimit
    ) {
        if (!workspaceContext.canManageAcademy()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "최근 변경 이력은 원장/관리자만 볼 수 있습니다.");
        }

        int limit = Math.max(1, Math.min(requestedLimit, 50));
        return auditLogClient.findRecentLogs(workspaceContext.academyId(), limit);
    }
}
