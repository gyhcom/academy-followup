package com.academyfollowup.api.attendance;

import com.academyfollowup.api.global.security.WorkspaceContext;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AttendanceServiceTest {

    private final SupabaseAttendanceClient attendanceClient = mock(SupabaseAttendanceClient.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-06-10T09:00:00Z"), ZoneOffset.UTC);
    private final AttendanceService service = new AttendanceService(attendanceClient, clock);

    @Test
    void returnsAllRecordsForOwner() {
        WorkspaceContext workspace = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(attendanceClient.findRecords("academy-1", "2026-06-10")).thenReturn(List.of(
                new SupabaseAttendanceClient.AttendanceRecord(
                        "attendance-1",
                        "student-1",
                        "class-1",
                        "teacher-1",
                        "2026-06-10",
                        "16:00:00",
                        "17:30:00",
                        "late",
                        "2026-06-10T09:00:00Z",
                        "2026-06-10T09:00:00Z",
                        "지각",
                        "followup-1",
                        List.of(new SupabaseAttendanceClient.FollowupRecord("draft", null))
                )
        ));

        var records = service.findRecords(workspace, "2026-06-10");

        assertThat(records).hasSize(1);
        assertThat(records.getFirst().scheduledStartTime()).isEqualTo("16:00");
        assertThat(records.getFirst().followupStatus()).isEqualTo("draft");
    }

    @Test
    void returnsAssignedClassRecordsForTeacher() {
        WorkspaceContext workspace = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");
        when(attendanceClient.findAssignedClassIds("academy-1", "teacher-1")).thenReturn(List.of(
                new SupabaseAttendanceClient.ClassIdRecord("class-1")
        ));
        when(attendanceClient.findRecordsForClasses("academy-1", "2026-06-10", List.of("class-1"))).thenReturn(List.of());

        var records = service.findRecords(workspace, "2026-06-10");

        assertThat(records).isEmpty();
        verify(attendanceClient).findRecordsForClasses("academy-1", "2026-06-10", List.of("class-1"));
    }

    @Test
    void savesPresentAttendanceWithCheckedAndArrivedAt() {
        WorkspaceContext workspace = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");
        when(attendanceClient.findClass("academy-1", "class-1")).thenReturn(Optional.of(
                new SupabaseAttendanceClient.ClassRecord("class-1", "teacher-1")
        ));
        when(attendanceClient.findStudent("academy-1", "student-1")).thenReturn(Optional.of(
                new SupabaseAttendanceClient.StudentRecord("student-1", "class-1", "active")
        ));
        when(attendanceClient.upsertAttendance(
                eq("academy-1"),
                eq("teacher-1"),
                any(AttendancePayload.class),
                eq("2026-06-10T09:00:00Z"),
                eq("2026-06-10T09:00:00Z")
        )).thenReturn(Optional.of(new SupabaseAttendanceClient.AttendanceRecord(
                "attendance-1",
                "student-1",
                "class-1",
                "teacher-1",
                "2026-06-10",
                "16:00:00",
                "17:30:00",
                "present",
                "2026-06-10T09:00:00Z",
                "2026-06-10T09:00:00Z",
                "도착",
                null,
                List.of()
        )));

        var record = service.save(workspace, request("present"));

        assertThat(record.id()).isEqualTo("attendance-1");
        assertThat(record.status()).isEqualTo("present");
        assertThat(record.arrivedAt()).isEqualTo("2026-06-10T09:00:00Z");
    }

    @Test
    void savesPendingAttendanceWithoutCheckedAndArrivedAt() {
        WorkspaceContext workspace = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");
        when(attendanceClient.findClass("academy-1", "class-1")).thenReturn(Optional.of(
                new SupabaseAttendanceClient.ClassRecord("class-1", "teacher-1")
        ));
        when(attendanceClient.findStudent("academy-1", "student-1")).thenReturn(Optional.of(
                new SupabaseAttendanceClient.StudentRecord("student-1", "class-1", "active")
        ));
        when(attendanceClient.upsertAttendance(
                eq("academy-1"),
                eq("teacher-1"),
                any(AttendancePayload.class),
                eq(null),
                eq(null)
        )).thenReturn(Optional.of(new SupabaseAttendanceClient.AttendanceRecord(
                "attendance-1",
                "student-1",
                "class-1",
                "teacher-1",
                "2026-06-10",
                "16:00:00",
                "17:30:00",
                "pending",
                null,
                null,
                null,
                null,
                List.of()
        )));

        var record = service.save(workspace, request("pending"));

        assertThat(record.status()).isEqualTo("pending");
        assertThat(record.checkedAt()).isNull();
        assertThat(record.arrivedAt()).isNull();
    }

    @Test
    void blocksTeacherOutsideAssignedClass() {
        WorkspaceContext workspace = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");
        when(attendanceClient.findClass("academy-1", "class-1")).thenReturn(Optional.of(
                new SupabaseAttendanceClient.ClassRecord("class-1", "other-teacher")
        ));
        when(attendanceClient.findStudent("academy-1", "student-1")).thenReturn(Optional.of(
                new SupabaseAttendanceClient.StudentRecord("student-1", "class-1", "active")
        ));

        assertThatThrownBy(() -> service.save(workspace, request("late")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("이 반의 출석부를 수정할 권한이 없습니다.");
    }

    @Test
    void blocksInactiveStudent() {
        WorkspaceContext workspace = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(attendanceClient.findClass("academy-1", "class-1")).thenReturn(Optional.of(
                new SupabaseAttendanceClient.ClassRecord("class-1", "teacher-1")
        ));
        when(attendanceClient.findStudent("academy-1", "student-1")).thenReturn(Optional.of(
                new SupabaseAttendanceClient.StudentRecord("student-1", "class-1", "inactive")
        ));

        assertThatThrownBy(() -> service.save(workspace, request("absent")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("비활성 학생은 출석부를 수정할 수 없습니다.");
    }

    @Test
    void blocksMismatchedStudentClass() {
        WorkspaceContext workspace = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(attendanceClient.findClass("academy-1", "class-1")).thenReturn(Optional.of(
                new SupabaseAttendanceClient.ClassRecord("class-1", "teacher-1")
        ));
        when(attendanceClient.findStudent("academy-1", "student-1")).thenReturn(Optional.of(
                new SupabaseAttendanceClient.StudentRecord("student-1", "class-2", "active")
        ));

        assertThatThrownBy(() -> service.save(workspace, request("absent")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("학생이 선택한 반에 속해 있지 않습니다.");
    }

    @Test
    void validatesRequestShape() {
        WorkspaceContext workspace = new WorkspaceContext("owner-1", "academy-1", "owner", "active");

        assertThatThrownBy(() -> service.findRecords(workspace, "2026-13-10"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("조회 날짜가 필요합니다.");
        assertThatThrownBy(() -> service.save(workspace, new AttendanceRequest(
                "student-1",
                "class-1",
                "2026-13-10",
                "16:00",
                "17:30",
                "present",
                null
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("출석 날짜는 YYYY-MM-DD 형식으로 입력해 주세요.");
        assertThatThrownBy(() -> service.save(workspace, new AttendanceRequest(
                "student-1",
                "class-1",
                "2026-06-10",
                "16:00",
                "16:00",
                "present",
                null
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("종료 시간은 시작 시간보다 늦어야 합니다.");
        assertThatThrownBy(() -> service.save(workspace, new AttendanceRequest(
                "student-1",
                "class-1",
                "2026-06-10",
                "16:00",
                "17:30",
                "unknown",
                null
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("지원하지 않는 출석 상태입니다.");
        assertThatThrownBy(() -> service.save(workspace, new AttendanceRequest(
                "student-1",
                "class-1",
                "2026-06-10",
                "16:00",
                "17:30",
                "present",
                "가".repeat(301)
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("메모는 300자 이하로 입력해 주세요.");
    }

    private AttendanceRequest request(String status) {
        return new AttendanceRequest(
                "student-1",
                "class-1",
                "2026-06-10",
                "16:00",
                "17:30",
                status,
                "도착"
        );
    }
}
