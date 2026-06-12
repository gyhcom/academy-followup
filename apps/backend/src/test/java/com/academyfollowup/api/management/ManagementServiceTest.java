package com.academyfollowup.api.management;

import com.academyfollowup.api.audit.AuditLogWriter;
import com.academyfollowup.api.global.security.WorkspaceContext;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ManagementServiceTest {

    private final SupabaseManagementClient managementClient = mock(SupabaseManagementClient.class);
    private final AuditLogWriter auditLogWriter = mock(AuditLogWriter.class);
    private final ManagementService service = new ManagementService(managementClient, auditLogWriter);

    @Test
    void createsClassForOwnerAndWritesAuditLog() {
        WorkspaceContext workspace = owner();
        when(managementClient.findProfile("academy-1", "teacher-1")).thenReturn(Optional.of(
                new SupabaseManagementClient.ProfileRecord("teacher-1", "academy-1", "teacher", "active")
        ));
        when(managementClient.insertClass("academy-1", new ClassPayload(
                null,
                "중2 수학 A반",
                "수학",
                "중2",
                "teacher-1"
        ))).thenReturn(new SupabaseManagementClient.ClassRecord(
                "class-1",
                "academy-1",
                "중2 수학 A반",
                "수학",
                "중2",
                "teacher-1"
        ));

        var response = service.createClass(workspace, new ClassRequest(
                null,
                "중2 수학 A반",
                "수학",
                "중2",
                "teacher-1"
        ));

        assertThat(response.id()).isEqualTo("class-1");
        verify(auditLogWriter).write(
                "academy-1",
                "owner-1",
                "class.create",
                "class",
                "class-1",
                "중2 수학 A반 반을 등록했습니다."
        );
    }

    @Test
    void blocksStudentManagementForTeacher() {
        assertThatThrownBy(() -> service.createStudent(
                new WorkspaceContext("teacher-1", "academy-1", "teacher", "active"),
                new StudentRequest(null, null, "김민준", null, null, null, "01012345678", null, false, "active")
        ))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("학생 관리는 원장 또는 관리자만 할 수 있습니다.");
    }

    @Test
    void createsStudentAndAutomaticShareLinkCandidate() {
        WorkspaceContext workspace = owner();
        var savedStudent = new SupabaseManagementClient.StudentRecord(
                "student-1",
                "academy-1",
                "class-1",
                "김민준",
                "더배움중",
                "중2",
                "김학부모",
                "01012345678",
                null,
                true,
                "active"
        );
        var candidate = new SupabaseManagementClient.StudentRecord(
                "student-2",
                "academy-2",
                "class-2",
                "김민준",
                "더배움중",
                "중2",
                "김학부모",
                "01012345678",
                null,
                true,
                "active"
        );
        when(managementClient.findClass("academy-1", "class-1")).thenReturn(Optional.of(
                new SupabaseManagementClient.ClassRecord("class-1", "academy-1", "중2 수학 A반", "수학", "중2", "teacher-1")
        ));
        when(managementClient.insertStudent("academy-1", "owner-1", new StudentPayload(
                null,
                "class-1",
                "김민준",
                "더배움중",
                "중2",
                "김학부모",
                "01012345678",
                null,
                true,
                "active"
        ))).thenReturn(savedStudent);
        when(managementClient.findActiveScheduleLinks("academy-1", "student-1", true)).thenReturn(List.of());
        when(managementClient.findActiveScheduleLinks("academy-1", "student-1", false)).thenReturn(List.of());
        when(managementClient.findStudentsByIds(List.of())).thenReturn(List.of());
        when(managementClient.findShareCandidates("academy-1")).thenReturn(List.of(candidate));
        when(managementClient.hasScheduleLink("student-1", "student-2")).thenReturn(false);
        when(managementClient.hasScheduleLink("student-2", "student-1")).thenReturn(false);

        var response = service.createStudent(workspace, new StudentRequest(
                null,
                "class-1",
                "김민준",
                "더배움중",
                "중2",
                "김학부모",
                "010-1234-5678",
                "",
                true,
                "active"
        ));

        assertThat(response.id()).isEqualTo("student-1");
        verify(managementClient).insertScheduleLink("academy-1", "student-1", candidate, "owner-1");
    }

    @Test
    void blocksTeacherScheduleOutsideAssignedClass() {
        WorkspaceContext workspace = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");
        when(managementClient.findStudent("academy-1", "student-1")).thenReturn(Optional.of(
                new SupabaseManagementClient.StudentRecord(
                        "student-1",
                        "academy-1",
                        "class-1",
                        "김민준",
                        null,
                        null,
                        null,
                        "01012345678",
                        null,
                        false,
                        "active"
                )
        ));
        when(managementClient.findClass("academy-1", "class-1")).thenReturn(Optional.of(
                new SupabaseManagementClient.ClassRecord("class-1", "academy-1", "중2 수학 A반", "수학", "중2", "other-teacher")
        ));

        assertThatThrownBy(() -> service.createSchedule(workspace, scheduleRequest()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("이 학생의 스케줄을 등록할 권한이 없습니다.");
    }

    @Test
    void blocksDuplicateMakeupSchedule() {
        WorkspaceContext workspace = owner();
        when(managementClient.findStudent("academy-1", "student-1")).thenReturn(Optional.of(
                new SupabaseManagementClient.StudentRecord(
                        "student-1",
                        "academy-1",
                        "class-1",
                        "김민준",
                        null,
                        null,
                        null,
                        "01012345678",
                        null,
                        false,
                        "active"
                )
        ));
        when(managementClient.findClass("academy-1", "class-1")).thenReturn(Optional.of(
                new SupabaseManagementClient.ClassRecord("class-1", "academy-1", "중2 수학 A반", "수학", "중2", "teacher-1")
        ));
        when(managementClient.findDuplicateOneOffSchedule(
                "academy-1",
                new StudentSchedulePayload(
                        null,
                        "student-1",
                        "class-1",
                        null,
                        "makeup",
                        "2026-06-10",
                        3,
                        "16:00",
                        "17:30",
                        "수학",
                        "김민준 보강",
                        null,
                        true,
                        null
                )
        )).thenReturn(Optional.of(new SupabaseManagementClient.IdRecord("schedule-1")));

        assertThatThrownBy(() -> service.createSchedule(workspace, scheduleRequest()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("이미 같은 날짜와 시간의 보강 일정이 등록되어 있습니다.");
    }

    private WorkspaceContext owner() {
        return new WorkspaceContext("owner-1", "academy-1", "owner", "active");
    }

    private StudentScheduleRequest scheduleRequest() {
        return new StudentScheduleRequest(
                null,
                "student-1",
                "class-1",
                "",
                "makeup",
                "2026-06-10",
                3,
                "16:00",
                "17:30",
                "수학",
                "김민준 보강",
                "",
                true,
                ""
        );
    }
}
