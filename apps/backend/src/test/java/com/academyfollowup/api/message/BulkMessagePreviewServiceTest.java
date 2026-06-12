package com.academyfollowup.api.message;

import com.academyfollowup.api.global.security.WorkspaceContext;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class BulkMessagePreviewServiceTest {

    private final SupabaseBulkMessageClient bulkMessageClient = mock(SupabaseBulkMessageClient.class);
    private final BulkMessagePreviewService service = new BulkMessagePreviewService(
            new BulkMessageRecipientResolver(bulkMessageClient)
    );

    @Test
    void countsRecipientsAndDuplicatePhonesLikeNextApi() {
        WorkspaceContext workspace = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(bulkMessageClient.findClasses("academy-1")).thenReturn(List.of(
                new SupabaseBulkMessageClient.ClassRecord("class-1", "중2")
        ));
        when(bulkMessageClient.findActiveStudents("academy-1")).thenReturn(List.of(
                new SupabaseBulkMessageClient.StudentRecord(
                        "student-1",
                        "class-1",
                        "중2",
                        "010-1111-2222",
                        "010-3333-4444",
                        "active"
                ),
                new SupabaseBulkMessageClient.StudentRecord(
                        "student-2",
                        "class-1",
                        "중2",
                        "01011112222",
                        "010-5555-6666",
                        "active"
                )
        ));

        BulkMessagePreviewResponse response = service.preview(
                workspace,
                new BulkMessagePreviewRequest("all", null, null, "both", true)
        );

        assertThat(response.targetStudentCount()).isEqualTo(2);
        assertThat(response.candidateRecipientCount()).isEqualTo(4);
        assertThat(response.recipientCount()).isEqualTo(3);
        assertThat(response.duplicateExcludedCount()).isEqualTo(1);
    }

    @Test
    void filtersByClassOrGrade() {
        WorkspaceContext workspace = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(bulkMessageClient.findClasses("academy-1")).thenReturn(List.of(
                new SupabaseBulkMessageClient.ClassRecord("class-1", "중2"),
                new SupabaseBulkMessageClient.ClassRecord("class-2", "중3")
        ));
        when(bulkMessageClient.findActiveStudents("academy-1")).thenReturn(List.of(
                new SupabaseBulkMessageClient.StudentRecord("student-1", "class-1", null, "01011112222", null, "active"),
                new SupabaseBulkMessageClient.StudentRecord("student-2", "class-2", "중3", "01033334444", null, "active")
        ));

        BulkMessagePreviewResponse classResponse = service.preview(
                workspace,
                new BulkMessagePreviewRequest("class", "class-1", null, "parent", true)
        );
        BulkMessagePreviewResponse gradeResponse = service.preview(
                workspace,
                new BulkMessagePreviewRequest("grade", null, "중2", "parent", true)
        );

        assertThat(classResponse.targetStudentCount()).isEqualTo(1);
        assertThat(gradeResponse.targetStudentCount()).isEqualTo(1);
    }

    @Test
    void blocksTeacherRole() {
        WorkspaceContext workspace = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");

        assertThatThrownBy(() -> service.preview(
                workspace,
                new BulkMessagePreviewRequest("all", null, null, "parent", true)
        ))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("전체문자는 원장 또는 관리자만 확인할 수 있습니다.");
    }
}
