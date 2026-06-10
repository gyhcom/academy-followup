package com.academyfollowup.api.report;

import com.academyfollowup.api.global.security.SupabaseAuthService;
import com.academyfollowup.api.global.security.WorkspaceContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ReportSummarySecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SupabaseAuthService supabaseAuthService;

    @MockBean
    private ReportSummaryService reportSummaryService;

    @Test
    void returnsReportSummaryForOwner() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("user-1", "academy-1", "owner", "active");
        when(supabaseAuthService.resolveWorkspace("owner-token")).thenReturn(workspaceContext);
        when(reportSummaryService.getSummary(eq(workspaceContext), eq(ReportRange.TODAY)))
                .thenReturn(new ReportSummaryResponse(new ReportSummaryResponse.ReportSummary(
                        "today",
                        "오늘",
                        new ReportSummaryResponse.Attendance(1, 1, 0, 0, 0, 0, 0),
                        new ReportSummaryResponse.Messages(1, 1, 1, 0, 0, 1, 0, 0),
                        new ReportSummaryResponse.Students(200, 20, 0),
                        new ReportSummaryResponse.Audit(3)
                )));

        mockMvc.perform(get("/api/reports/summary").header("Authorization", "Bearer owner-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.range").value("today"))
                .andExpect(jsonPath("$.summary.students.active").value(200))
                .andExpect(jsonPath("$.summary.students.classes").value(20));
    }

    @Test
    void blocksMissingBearerToken() throws Exception {
        mockMvc.perform(get("/api/reports/summary"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("로그인이 필요합니다."));
    }

    @Test
    void blocksTeacherRole() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("user-1", "academy-1", "teacher", "active");
        when(supabaseAuthService.resolveWorkspace("teacher-token")).thenReturn(workspaceContext);
        when(reportSummaryService.getSummary(eq(workspaceContext), eq(ReportRange.TODAY)))
                .thenThrow(new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.FORBIDDEN,
                        "운영 리포트는 원장/관리자만 볼 수 있습니다."
                ));

        mockMvc.perform(get("/api/reports/summary").header("Authorization", "Bearer teacher-token"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("운영 리포트는 원장/관리자만 볼 수 있습니다."));
    }
}
