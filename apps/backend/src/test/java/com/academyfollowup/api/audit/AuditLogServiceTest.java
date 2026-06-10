package com.academyfollowup.api.audit;

import com.academyfollowup.api.global.security.WorkspaceContext;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuditLogServiceTest {

    private final SupabaseAuditLogClient auditLogClient = mock(SupabaseAuditLogClient.class);
    private final AuditLogService auditLogService = new AuditLogService(auditLogClient);

    @Test
    void returnsRecentAuditLogsForOwner() {
        WorkspaceContext workspace = new WorkspaceContext("user-1", "academy-1", "owner", "active");
        var expected = List.of(new AuditLogsResponse.AuditLogItem(
                "audit-1",
                "김원장",
                "student.update",
                "student",
                "student-1",
                "학생 정보를 수정했습니다.",
                "2026-06-10T10:00:00+09:00"
        ));

        when(auditLogClient.findRecentLogs("academy-1", 20)).thenReturn(expected);

        assertThat(auditLogService.findRecentLogs(workspace, 20)).isEqualTo(expected);
    }

    @Test
    void clampsLimitToFifty() {
        WorkspaceContext workspace = new WorkspaceContext("user-1", "academy-1", "manager", "active");

        when(auditLogClient.findRecentLogs("academy-1", 50)).thenReturn(List.of());

        assertThat(auditLogService.findRecentLogs(workspace, 200)).isEmpty();
    }

    @Test
    void blocksTeacherRole() {
        WorkspaceContext workspace = new WorkspaceContext("user-1", "academy-1", "teacher", "active");

        assertThatThrownBy(() -> auditLogService.findRecentLogs(workspace, 20))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("최근 변경 이력은 원장/관리자만 볼 수 있습니다.");
    }
}
