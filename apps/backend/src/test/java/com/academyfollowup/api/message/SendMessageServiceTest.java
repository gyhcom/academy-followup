package com.academyfollowup.api.message;

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
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SendMessageServiceTest {

    private final SupabaseMessageSendClient messageSendClient = mock(SupabaseMessageSendClient.class);
    private final SolapiClient solapiClient = mock(SolapiClient.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-06-10T10:00:00Z"), ZoneOffset.UTC);
    private final SendMessageService service = new SendMessageService(
            messageSendClient,
            new MessageLengthMetricsCalculator(),
            solapiClient,
            clock
    );

    @Test
    void savesDryRunResultForOwner() {
        WorkspaceContext workspace = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        mockFollowup("teacher-1", "active", "parent", "결석 안내");
        when(messageSendClient.findSettings("academy-1")).thenReturn(Optional.of(settings(false, true, 1440)));
        when(messageSendClient.hasDuplicateSentFollowup(eq("academy-1"), eq("student-1"), eq("absence"), eq("parent"), anyString()))
                .thenReturn(false);

        SendMessageResponse response = service.send(workspace, new SendMessageRequest("followup-1"));

        assertThat(response.dryRun()).isTrue();
        assertThat(response.recipientCount()).isEqualTo(1);
        assertThat(response.recipientPhone()).isEqualTo("010-****-5678");
        verify(messageSendClient).insertMessageLogs(eq("academy-1"), eq("followup-1"), anyList(), eq("dry_run"), eq(null));
        verify(messageSendClient).updateFollowupStatus("academy-1", "followup-1", "sent", "2026-06-10T10:00:00Z");
    }

    @Test
    void blocksAssistantWhenPolicyDisabled() {
        WorkspaceContext workspace = new WorkspaceContext("assistant-1", "academy-1", "assistant", "active");
        mockFollowup("assistant-1", "active", "parent", "결석 안내");
        when(messageSendClient.findSettings("academy-1")).thenReturn(Optional.of(settings(false, true, 1440)));

        assertThatThrownBy(() -> service.send(workspace, new SendMessageRequest("followup-1")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("이 연락 기록을 발송할 권한이 없습니다.");
    }

    @Test
    void blocksInactiveStudent() {
        WorkspaceContext workspace = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        mockFollowup("teacher-1", "inactive", "parent", "결석 안내");

        assertThatThrownBy(() -> service.send(workspace, new SendMessageRequest("followup-1")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("비활성 학생에게는 문자를 발송할 수 없습니다.");
    }

    @Test
    void blocksDuplicateSend() {
        WorkspaceContext workspace = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        mockFollowup("teacher-1", "active", "parent", "결석 안내");
        when(messageSendClient.findSettings("academy-1")).thenReturn(Optional.of(settings(false, true, 60)));
        when(messageSendClient.hasDuplicateSentFollowup(eq("academy-1"), eq("student-1"), eq("absence"), eq("parent"), anyString()))
                .thenReturn(true);

        assertThatThrownBy(() -> service.send(workspace, new SendMessageRequest("followup-1")))
                .isInstanceOf(DuplicateMessageException.class)
                .hasMessageContaining("최근 발송 기록이 있어 중복 발송을 차단했습니다.");
    }

    @Test
    void sendsRealMessageAndStoresProviderMessageId() {
        WorkspaceContext workspace = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");
        mockFollowup("teacher-1", "active", "student", "지각 안내");
        when(messageSendClient.findSettings("academy-1")).thenReturn(Optional.of(settings(false, false, 1440)));
        when(messageSendClient.hasDuplicateSentFollowup(eq("academy-1"), eq("student-1"), eq("absence"), eq("student"), anyString()))
                .thenReturn(false);
        when(solapiClient.sendSms("01022223333", "지각 안내")).thenReturn("provider-1");

        SendMessageResponse response = service.send(workspace, new SendMessageRequest("followup-1"));

        assertThat(response.dryRun()).isFalse();
        verify(messageSendClient).insertMessageLogs(eq("academy-1"), eq("followup-1"), anyList(), eq("sent"), eq(null));
        verify(messageSendClient).updateFollowupStatus("academy-1", "followup-1", "sent", "2026-06-10T10:00:00Z");
    }

    @Test
    void storesFailedResultWhenSolapiFails() {
        WorkspaceContext workspace = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        mockFollowup("teacher-1", "active", "parent", "결석 안내");
        when(messageSendClient.findSettings("academy-1")).thenReturn(Optional.of(settings(false, false, 1440)));
        when(messageSendClient.hasDuplicateSentFollowup(eq("academy-1"), eq("student-1"), eq("absence"), eq("parent"), anyString()))
                .thenReturn(false);
        when(solapiClient.sendSms("01012345678", "결석 안내")).thenThrow(new IllegalStateException("SOLAPI 실패"));

        assertThatThrownBy(() -> service.send(workspace, new SendMessageRequest("followup-1")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("SOLAPI 실패");
        verify(messageSendClient).insertMessageLogs(eq("academy-1"), eq("followup-1"), anyList(), eq("failed"), eq("SOLAPI 실패"));
        verify(messageSendClient).updateFollowupStatus("academy-1", "followup-1", "failed", null);
    }

    private void mockFollowup(String teacherId, String studentStatus, String recipientType, String messageBody) {
        when(messageSendClient.findFollowup("academy-1", "followup-1")).thenReturn(Optional.of(
                new SupabaseMessageSendClient.FollowupRecord(
                        "followup-1",
                        "academy-1",
                        "student-1",
                        "class-1",
                        "absence",
                        messageBody,
                        recipientType,
                        "draft",
                        new SupabaseMessageSendClient.StudentRecord("01012345678", "01022223333", studentStatus),
                        new SupabaseMessageSendClient.ClassRecord(teacherId)
                )
        ));
    }

    private SupabaseMessageSendClient.SettingsRecord settings(
            boolean allowAssistantSend,
            boolean smsDryRun,
            int duplicateGuardMinutes
    ) {
        return new SupabaseMessageSendClient.SettingsRecord(allowAssistantSend, smsDryRun, duplicateGuardMinutes);
    }
}
