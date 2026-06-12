package com.academyfollowup.api.message;

import com.academyfollowup.api.audit.AuditLogWriter;
import com.academyfollowup.api.global.security.WorkspaceContext;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MessageTemplateServiceTest {

    private final SupabaseMessageClient messageClient = mock(SupabaseMessageClient.class);
    private final AuditLogWriter auditLogWriter = mock(AuditLogWriter.class);
    private final MessageTemplateService service = new MessageTemplateService(
            messageClient,
            new MessageLengthMetricsCalculator(),
            auditLogWriter
    );

    @Test
    void overlaysSavedTemplatesOnDefaults() {
        WorkspaceContext workspace = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(messageClient.findTemplates("academy-1")).thenReturn(List.of(
                new SupabaseMessageClient.TemplateRecord(
                        "template-1",
                        "absence",
                        "결석 커스텀",
                        "커스텀 본문",
                        true,
                        "2026-06-01T00:00:00+09:00"
                )
        ));

        List<MessageTemplateResponse.MessageTemplateItem> templates = service.findTemplates(workspace);

        assertThat(templates).hasSize(FollowupReason.values().length);
        assertThat(templates)
                .filteredOn(template -> "absence".equals(template.reason()))
                .singleElement()
                .satisfies(template -> {
                    assertThat(template.id()).isEqualTo("template-1");
                    assertThat(template.title()).isEqualTo("결석 커스텀");
                    assertThat(template.body()).isEqualTo("커스텀 본문");
                    assertThat(template.isActive()).isTrue();
                });
    }

    @Test
    void blocksTeacherRole() {
        WorkspaceContext workspace = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");

        assertThatThrownBy(() -> service.findTemplates(workspace))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("문자 템플릿 관리는 원장 또는 관리자만 할 수 있습니다.");
    }

    @Test
    void savesTemplateAndWritesAuditLog() {
        WorkspaceContext workspace = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(messageClient.upsertTemplate(
                "academy-1",
                "absence",
                "결석 안내",
                "결석 본문",
                true
        )).thenReturn(Optional.of(new SupabaseMessageClient.TemplateRecord(
                "template-1",
                "absence",
                "결석 안내",
                "결석 본문",
                true,
                "2026-06-01T00:00:00+09:00"
        )));

        MessageTemplateSaveResponse response = service.saveTemplate(
                workspace,
                new MessageTemplateSaveRequest("absence", " 결석 안내 ", " 결석 본문 ", true)
        );

        assertThat(response.template().id()).isEqualTo("template-1");
        assertThat(response.template().body()).isEqualTo("결석 본문");
        verify(auditLogWriter).write(
                "academy-1",
                "owner-1",
                "message_template.update",
                "message_template",
                "template-1",
                "결석 문자 템플릿을 수정했습니다."
        );
    }
}
