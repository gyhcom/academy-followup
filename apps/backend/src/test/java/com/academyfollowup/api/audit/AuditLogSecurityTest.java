package com.academyfollowup.api.audit;

import com.academyfollowup.api.global.security.SupabaseAuthService;
import com.academyfollowup.api.global.security.WorkspaceContext;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuditLogSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SupabaseAuthService supabaseAuthService;

    @MockBean
    private AuditLogService auditLogService;

    @Test
    void returnsAuditLogsForOwner() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("user-1", "academy-1", "owner", "active");
        when(supabaseAuthService.resolveWorkspace("owner-token")).thenReturn(workspaceContext);
        when(auditLogService.findRecentLogs(eq(workspaceContext), eq(20)))
                .thenReturn(List.of(new AuditLogsResponse.AuditLogItem(
                        "audit-1",
                        "김원장",
                        "student.update",
                        "student",
                        "student-1",
                        "학생 정보를 수정했습니다.",
                        "2026-06-10T10:00:00+09:00"
                )));

        mockMvc.perform(get("/api/audit/logs").header("Authorization", "Bearer owner-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.logs[0].id").value("audit-1"))
                .andExpect(jsonPath("$.logs[0].actorName").value("김원장"));
    }

    @Test
    void blocksMissingBearerToken() throws Exception {
        mockMvc.perform(get("/api/audit/logs"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("로그인이 필요합니다."));
    }

    @Test
    void blocksTeacherRole() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("user-1", "academy-1", "teacher", "active");
        when(supabaseAuthService.resolveWorkspace("teacher-token")).thenReturn(workspaceContext);
        when(auditLogService.findRecentLogs(eq(workspaceContext), eq(20)))
                .thenThrow(new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "최근 변경 이력은 원장/관리자만 볼 수 있습니다."
                ));

        mockMvc.perform(get("/api/audit/logs").header("Authorization", "Bearer teacher-token"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("최근 변경 이력은 원장/관리자만 볼 수 있습니다."));
    }
}
