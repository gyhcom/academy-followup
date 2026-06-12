package com.academyfollowup.api.attendance;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AttendanceApiSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SupabaseAuthService supabaseAuthService;

    @MockBean
    private AttendanceService attendanceService;

    @Test
    void recordsRequireBearerToken() throws Exception {
        mockMvc.perform(get("/api/attendance?date=2026-06-10"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("로그인이 필요합니다."));
    }

    @Test
    void returnsRecordsForOwner() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(supabaseAuthService.resolveWorkspace("owner-token")).thenReturn(workspaceContext);
        when(attendanceService.findRecords(eq(workspaceContext), eq("2026-06-10"))).thenReturn(List.of(
                new AttendanceResponse.AttendanceRecordItem(
                        "attendance-1",
                        "student-1",
                        "class-1",
                        "teacher-1",
                        "2026-06-10",
                        "16:00",
                        "17:30",
                        "present",
                        "2026-06-10T09:00:00Z",
                        "2026-06-10T09:00:00Z",
                        "도착",
                        null,
                        null,
                        null
                )
        ));

        mockMvc.perform(get("/api/attendance?date=2026-06-10")
                        .header("Authorization", "Bearer owner-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.records[0].id").value("attendance-1"))
                .andExpect(jsonPath("$.records[0].status").value("present"));
    }

    @Test
    void savesRecordForTeacher() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");
        when(supabaseAuthService.resolveWorkspace("teacher-token")).thenReturn(workspaceContext);
        when(attendanceService.save(eq(workspaceContext), any(AttendanceRequest.class))).thenReturn(
                new AttendanceResponse.AttendanceRecordItem(
                        "attendance-1",
                        "student-1",
                        "class-1",
                        "teacher-1",
                        "2026-06-10",
                        "16:00",
                        "17:30",
                        "late",
                        "2026-06-10T09:00:00Z",
                        "2026-06-10T09:00:00Z",
                        "지각",
                        null,
                        null,
                        null
                )
        );

        mockMvc.perform(patch("/api/attendance")
                        .header("Authorization", "Bearer teacher-token")
                        .contentType("application/json")
                        .content("""
                                {
                                  "studentId": "student-1",
                                  "classId": "class-1",
                                  "attendanceDate": "2026-06-10",
                                  "scheduledStartTime": "16:00",
                                  "scheduledEndTime": "17:30",
                                  "status": "late",
                                  "note": "지각"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.record.id").value("attendance-1"))
                .andExpect(jsonPath("$.record.status").value("late"));
    }

    @Test
    void returnsForbiddenFromService() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");
        when(supabaseAuthService.resolveWorkspace("teacher-token")).thenReturn(workspaceContext);
        when(attendanceService.save(eq(workspaceContext), any(AttendanceRequest.class))).thenThrow(
                new ResponseStatusException(HttpStatus.FORBIDDEN, "이 반의 출석부를 수정할 권한이 없습니다.")
        );

        mockMvc.perform(patch("/api/attendance")
                        .header("Authorization", "Bearer teacher-token")
                        .contentType("application/json")
                        .content("""
                                {
                                  "studentId": "student-1",
                                  "classId": "class-1",
                                  "attendanceDate": "2026-06-10",
                                  "scheduledStartTime": "16:00",
                                  "scheduledEndTime": "17:30",
                                  "status": "late",
                                  "note": "지각"
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("이 반의 출석부를 수정할 권한이 없습니다."));
    }
}
