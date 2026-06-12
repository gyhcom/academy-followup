package com.academyfollowup.api.followup;

import com.academyfollowup.api.global.security.WorkspaceContext;
import com.academyfollowup.api.message.MessageLengthMetricsCalculator;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FollowupServiceTest {

    private final SupabaseFollowupClient followupClient = mock(SupabaseFollowupClient.class);
    private final FollowupService service = new FollowupService(
            followupClient,
            new MessageLengthMetricsCalculator()
    );

    @Test
    void returnsHistoryForAssignedTeacher() {
        WorkspaceContext workspace = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");
        when(followupClient.findStudent("academy-1", "student-1")).thenReturn(Optional.of(
                new SupabaseFollowupClient.StudentRecord("student-1", "academy-1", "class-1", "김민준", "active")
        ));
        when(followupClient.findClass("academy-1", "class-1")).thenReturn(Optional.of(
                new SupabaseFollowupClient.ClassRecord("class-1", "academy-1", "중2 수학 A반", "teacher-1")
        ));
        when(followupClient.findHistory("academy-1", "student-1")).thenReturn(List.of(
                new SupabaseFollowupClient.FollowupHistoryRecord(
                        "followup-1",
                        "absence",
                        "결석 안내",
                        "parent",
                        "draft",
                        null,
                        "2026-06-10T10:00:00+09:00"
                )
        ));

        var history = service.findHistory(workspace, "student-1");

        assertThat(history).hasSize(1);
        assertThat(history.getFirst().messageBody()).isEqualTo("결석 안내");
    }

    @Test
    void createsDraftFollowupAndLinksLateAttendance() {
        WorkspaceContext workspace = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");
        when(followupClient.findStudent("academy-1", "student-1")).thenReturn(Optional.of(
                new SupabaseFollowupClient.StudentRecord("student-1", "academy-1", "class-1", "김민준", "active")
        ));
        when(followupClient.findClass("academy-1", "class-1")).thenReturn(Optional.of(
                new SupabaseFollowupClient.ClassRecord("class-1", "academy-1", "중2 수학 A반", "teacher-1")
        ));
        when(followupClient.findAttendanceRecord("academy-1", "attendance-1")).thenReturn(Optional.of(
                new SupabaseFollowupClient.AttendanceRecord("attendance-1", "academy-1", "student-1", "class-1", "late", null)
        ));
        when(followupClient.insertFollowup(
                "academy-1",
                "student-1",
                "class-1",
                "teacher-1",
                "late",
                "지각 안내",
                "parent"
        )).thenReturn(Optional.of(new SupabaseFollowupClient.CreatedFollowupRecord(
                "followup-1",
                "draft",
                "2026-06-10T10:00:00+09:00"
        )));

        var response = service.create(workspace, new CreateFollowupRequest(
                "student-1",
                "late",
                " 지각 안내 ",
                "attendance-1",
                "parent"
        ));

        assertThat(response.id()).isEqualTo("followup-1");
        assertThat(response.status()).isEqualTo("draft");
        assertThat(response.attendanceRecordId()).isEqualTo("attendance-1");
        verify(followupClient).updateAttendanceFollowup("academy-1", "attendance-1", "followup-1");
    }

    @Test
    void blocksTeacherOutsideAssignedClass() {
        WorkspaceContext workspace = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");
        when(followupClient.findStudent("academy-1", "student-1")).thenReturn(Optional.of(
                new SupabaseFollowupClient.StudentRecord("student-1", "academy-1", "class-1", "김민준", "active")
        ));
        when(followupClient.findClass("academy-1", "class-1")).thenReturn(Optional.of(
                new SupabaseFollowupClient.ClassRecord("class-1", "academy-1", "중2 수학 A반", "other-teacher")
        ));

        assertThatThrownBy(() -> service.create(workspace, new CreateFollowupRequest(
                "student-1",
                "absence",
                "결석 안내",
                null,
                "parent"
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("이 학생의 연락 기록을 만들 권한이 없습니다.");
    }

    @Test
    void blocksInactiveStudentOnCreate() {
        WorkspaceContext workspace = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(followupClient.findStudent("academy-1", "student-1")).thenReturn(Optional.of(
                new SupabaseFollowupClient.StudentRecord("student-1", "academy-1", "class-1", "김민준", "inactive")
        ));
        when(followupClient.findClass("academy-1", "class-1")).thenReturn(Optional.of(
                new SupabaseFollowupClient.ClassRecord("class-1", "academy-1", "중2 수학 A반", "teacher-1")
        ));

        assertThatThrownBy(() -> service.create(workspace, new CreateFollowupRequest(
                "student-1",
                "absence",
                "결석 안내",
                null,
                "parent"
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("비활성 학생은 연락 기록을 만들 수 없습니다.");
    }

    @Test
    void blocksInvalidReasonRecipientAndOverLimitBody() {
        WorkspaceContext workspace = new WorkspaceContext("owner-1", "academy-1", "owner", "active");

        assertThatThrownBy(() -> service.create(workspace, new CreateFollowupRequest(
                "student-1",
                "unknown",
                "결석 안내",
                null,
                "parent"
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("지원하지 않는 연락 사유입니다.");

        assertThatThrownBy(() -> service.create(workspace, new CreateFollowupRequest(
                "student-1",
                "absence",
                "결석 안내",
                null,
                "unknown"
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("지원하지 않는 문자 수신자입니다.");

        assertThatThrownBy(() -> service.create(workspace, new CreateFollowupRequest(
                "student-1",
                "absence",
                "가".repeat(1001),
                null,
                "parent"
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("문자 본문은 2000byte 이하로 입력해 주세요.");
    }

    @Test
    void blocksInvalidAttendanceRecordForFollowup() {
        WorkspaceContext workspace = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(followupClient.findStudent("academy-1", "student-1")).thenReturn(Optional.of(
                new SupabaseFollowupClient.StudentRecord("student-1", "academy-1", "class-1", "김민준", "active")
        ));
        when(followupClient.findClass("academy-1", "class-1")).thenReturn(Optional.of(
                new SupabaseFollowupClient.ClassRecord("class-1", "academy-1", "중2 수학 A반", "teacher-1")
        ));
        when(followupClient.findAttendanceRecord("academy-1", "attendance-1")).thenReturn(Optional.of(
                new SupabaseFollowupClient.AttendanceRecord("attendance-1", "academy-1", "student-2", "class-1", "present", null)
        ));

        assertThatThrownBy(() -> service.create(workspace, new CreateFollowupRequest(
                "student-1",
                "absence",
                "결석 안내",
                "attendance-1",
                "parent"
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("결석 또는 지각 출석 기록만 문자 연락 기록과 연결할 수 있습니다.");
    }

    @Test
    void blocksMismatchedAttendanceStudent() {
        WorkspaceContext workspace = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(followupClient.findStudent("academy-1", "student-1")).thenReturn(Optional.of(
                new SupabaseFollowupClient.StudentRecord("student-1", "academy-1", "class-1", "김민준", "active")
        ));
        when(followupClient.findClass("academy-1", "class-1")).thenReturn(Optional.of(
                new SupabaseFollowupClient.ClassRecord("class-1", "academy-1", "중2 수학 A반", "teacher-1")
        ));
        when(followupClient.findAttendanceRecord("academy-1", "attendance-1")).thenReturn(Optional.of(
                new SupabaseFollowupClient.AttendanceRecord("attendance-1", "academy-1", "student-2", "class-1", "late", null)
        ));

        assertThatThrownBy(() -> service.create(workspace, new CreateFollowupRequest(
                "student-1",
                "late",
                "지각 안내",
                "attendance-1",
                "parent"
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("출석 기록과 팔로업 대상 학생 정보가 일치하지 않습니다.");
    }
}
