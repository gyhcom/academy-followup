package com.academyfollowup.api.message;

import com.academyfollowup.api.global.security.WorkspaceContext;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MessagePreviewServiceTest {

    private final SupabaseMessageClient messageClient = mock(SupabaseMessageClient.class);
    private final MessagePreviewService service = new MessagePreviewService(
            messageClient,
            new TemplateRenderer(),
            new MessageLengthMetricsCalculator()
    );

    @Test
    void rendersPreviewWithDefaultTemplateAndPermissionCheck() {
        WorkspaceContext workspace = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");
        when(messageClient.findProfile("teacher-1")).thenReturn(Optional.of(
                new SupabaseMessageClient.ProfileRecord("teacher-1", "김선생")
        ));
        when(messageClient.findAcademy("academy-1")).thenReturn(Optional.of(
                new SupabaseMessageClient.AcademyRecord("academy-1", "더배움", "더배움")
        ));
        when(messageClient.findStudent("academy-1", "student-1")).thenReturn(Optional.of(
                new SupabaseMessageClient.StudentRecord("student-1", "academy-1", "class-1", "김민준", "active")
        ));
        when(messageClient.findClass("academy-1", "class-1")).thenReturn(Optional.of(
                new SupabaseMessageClient.ClassRecord("class-1", "academy-1", "중2 수학 A반", "teacher-1")
        ));
        when(messageClient.findActiveTemplate("academy-1", "absence")).thenReturn(Optional.empty());

        MessagePreviewResponse response = service.preview(
                workspace,
                new MessagePreviewRequest("student-1", "absence", null)
        );

        assertThat(response.title()).isEqualTo("결석 안내");
        assertThat(response.body()).contains("김민준");
        assertThat(response.reason()).isEqualTo("absence");
        assertThat(response.metrics().byteCount()).isGreaterThan(0);
    }

    @Test
    void blocksTeacherOutsideAssignedClass() {
        WorkspaceContext workspace = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");
        when(messageClient.findProfile("teacher-1")).thenReturn(Optional.of(
                new SupabaseMessageClient.ProfileRecord("teacher-1", "김선생")
        ));
        when(messageClient.findAcademy("academy-1")).thenReturn(Optional.of(
                new SupabaseMessageClient.AcademyRecord("academy-1", "더배움", "더배움")
        ));
        when(messageClient.findStudent("academy-1", "student-1")).thenReturn(Optional.of(
                new SupabaseMessageClient.StudentRecord("student-1", "academy-1", "class-1", "김민준", "active")
        ));
        when(messageClient.findClass("academy-1", "class-1")).thenReturn(Optional.of(
                new SupabaseMessageClient.ClassRecord("class-1", "academy-1", "중2 수학 A반", "other-teacher")
        ));

        assertThatThrownBy(() -> service.preview(
                workspace,
                new MessagePreviewRequest("student-1", "absence", null)
        ))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("이 학생의 문자 미리보기를 만들 권한이 없습니다.");
    }
}
