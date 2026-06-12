package com.academyfollowup.api.report;

import com.academyfollowup.api.global.security.SupabaseAuthService;
import com.academyfollowup.api.global.security.WorkspaceContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ReportExportSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SupabaseAuthService supabaseAuthService;

    @MockBean
    private ReportExportService reportExportService;

    @Test
    void exportsCsvForOwner() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(supabaseAuthService.resolveWorkspace("owner-token")).thenReturn(workspaceContext);
        when(reportExportService.export(
                eq(workspaceContext),
                eq(ReportExportType.STUDENTS),
                eq(ReportRange.TODAY),
                eq(false)
        )).thenReturn(new CsvExport("academy-students-2026-06-10.csv", "학생명\n김민준"));

        mockMvc.perform(get("/api/reports/export?type=students")
                        .header("Authorization", "Bearer owner-token"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("academy-students-2026-06-10.csv")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("김민준")));
    }

    @Test
    void blocksMissingBearerToken() throws Exception {
        mockMvc.perform(get("/api/reports/export?type=students"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("로그인이 필요합니다."));
    }

    @Test
    void blocksTeacherRole() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");
        when(supabaseAuthService.resolveWorkspace("teacher-token")).thenReturn(workspaceContext);
        when(reportExportService.export(
                eq(workspaceContext),
                eq(ReportExportType.STUDENTS),
                any(ReportRange.class),
                eq(false)
        )).thenThrow(new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "운영 리포트는 원장/관리자만 볼 수 있습니다."
        ));

        mockMvc.perform(get("/api/reports/export?type=students")
                        .header("Authorization", "Bearer teacher-token"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("운영 리포트는 원장/관리자만 볼 수 있습니다."));
    }

    @Test
    void blocksInvalidExportType() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(supabaseAuthService.resolveWorkspace("owner-token")).thenReturn(workspaceContext);

        mockMvc.perform(get("/api/reports/export?type=unknown")
                        .header("Authorization", "Bearer owner-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("내보내기 종류가 올바르지 않습니다."));
    }
}
