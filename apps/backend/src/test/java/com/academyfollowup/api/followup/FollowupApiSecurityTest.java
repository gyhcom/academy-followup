package com.academyfollowup.api.followup;

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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class FollowupApiSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SupabaseAuthService supabaseAuthService;

    @MockBean
    private FollowupService followupService;

    @Test
    void historyRequiresBearerToken() throws Exception {
        mockMvc.perform(get("/api/followups?studentId=student-1"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("로그인이 필요합니다."));
    }

    @Test
    void returnsHistoryForOwner() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(supabaseAuthService.resolveWorkspace("owner-token")).thenReturn(workspaceContext);
        when(followupService.findHistory(eq(workspaceContext), eq("student-1"))).thenReturn(List.of(
                new FollowupHistoryResponse.FollowupHistoryItem(
                        "followup-1",
                        "absence",
                        "결석 안내",
                        "parent",
                        "draft",
                        null,
                        "2026-06-10T10:00:00+09:00"
                )
        ));

        mockMvc.perform(get("/api/followups?studentId=student-1")
                        .header("Authorization", "Bearer owner-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.followups[0].id").value("followup-1"))
                .andExpect(jsonPath("$.followups[0].messageBody").value("결석 안내"));
    }

    @Test
    void createsFollowupForTeacher() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");
        when(supabaseAuthService.resolveWorkspace("teacher-token")).thenReturn(workspaceContext);
        when(followupService.create(eq(workspaceContext), any(CreateFollowupRequest.class))).thenReturn(
                new CreateFollowupResponse.FollowupCreated(
                        "followup-1",
                        "draft",
                        "2026-06-10T10:00:00+09:00",
                        "attendance-1"
                )
        );

        mockMvc.perform(post("/api/followups")
                        .header("Authorization", "Bearer teacher-token")
                        .contentType("application/json")
                        .content("""
                                {
                                  "studentId": "student-1",
                                  "reason": "late",
                                  "messageBody": "지각 안내",
                                  "attendanceRecordId": "attendance-1",
                                  "recipientType": "parent"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.followup.id").value("followup-1"))
                .andExpect(jsonPath("$.followup.status").value("draft"))
                .andExpect(jsonPath("$.followup.attendanceRecordId").value("attendance-1"));
    }

    @Test
    void returnsForbiddenFromService() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");
        when(supabaseAuthService.resolveWorkspace("teacher-token")).thenReturn(workspaceContext);
        when(followupService.create(eq(workspaceContext), any(CreateFollowupRequest.class))).thenThrow(
                new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "이 학생의 연락 기록을 만들 권한이 없습니다."
                )
        );

        mockMvc.perform(post("/api/followups")
                        .header("Authorization", "Bearer teacher-token")
                        .contentType("application/json")
                        .content("""
                                {
                                  "studentId": "student-1",
                                  "reason": "absence",
                                  "messageBody": "결석 안내",
                                  "recipientType": "parent"
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("이 학생의 연락 기록을 만들 권한이 없습니다."));
    }

    @Test
    void returnsNotFoundFromService() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(supabaseAuthService.resolveWorkspace("owner-token")).thenReturn(workspaceContext);
        when(followupService.findHistory(eq(workspaceContext), eq("missing-student"))).thenThrow(
                new ResponseStatusException(HttpStatus.NOT_FOUND, "선택한 학생을 찾을 수 없습니다.")
        );

        mockMvc.perform(get("/api/followups?studentId=missing-student")
                        .header("Authorization", "Bearer owner-token"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("선택한 학생을 찾을 수 없습니다."));
    }
}
