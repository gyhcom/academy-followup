package com.academyfollowup.api.message;

import com.academyfollowup.api.global.security.WorkspaceContext;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BulkMessageSendServiceTest {

    private final SupabaseBulkMessageClient bulkMessageClient = mock(SupabaseBulkMessageClient.class);
    private final SolapiClient solapiClient = mock(SolapiClient.class);
    private final BulkMessageSendService service = new BulkMessageSendService(
            new BulkMessageRecipientResolver(bulkMessageClient),
            bulkMessageClient,
            new MessageLengthMetricsCalculator(),
            solapiClient
    );

    @Test
    void createsDryRunFollowupsAndLogsForOwner() {
        WorkspaceContext workspace = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        mockTargets();
        when(bulkMessageClient.findSettings("academy-1"))
                .thenReturn(Optional.of(new SupabaseBulkMessageClient.SettingsRecord(true)));
        when(bulkMessageClient.insertBulkFollowups(eq("academy-1"), eq("owner-1"), eq("공지입니다."), anyList()))
                .thenReturn(List.of(
                        new SupabaseBulkMessageClient.CreatedFollowupRecord("followup-1", "student-1"),
                        new SupabaseBulkMessageClient.CreatedFollowupRecord("followup-2", "student-2")
                ));

        BulkMessageSendResponse response = service.send(workspace, new BulkMessageSendRequest(
                "all",
                null,
                null,
                "parent",
                " 공지입니다. ",
                true
        ));

        assertThat(response.dryRun()).isTrue();
        assertThat(response.message()).isEqualTo("전체문자 테스트 발송 기록을 저장했습니다.");
        assertThat(response.targetStudentCount()).isEqualTo(2);
        assertThat(response.recipientCount()).isEqualTo(2);
        verify(bulkMessageClient).insertBulkMessageLogs(eq("academy-1"), anyList(), anyList(), eq("dry_run"));
        verify(bulkMessageClient).updateFollowupsSent("academy-1", List.of("followup-1", "followup-2"));
    }

    @Test
    void sendsRealBulkMessagesWhenDryRunIsFalse() {
        WorkspaceContext workspace = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        mockTargets();
        when(bulkMessageClient.findSettings("academy-1"))
                .thenReturn(Optional.of(new SupabaseBulkMessageClient.SettingsRecord(false)));
        when(bulkMessageClient.insertBulkFollowups(eq("academy-1"), eq("owner-1"), eq("공지"), anyList()))
                .thenReturn(List.of(
                        new SupabaseBulkMessageClient.CreatedFollowupRecord("followup-1", "student-1"),
                        new SupabaseBulkMessageClient.CreatedFollowupRecord("followup-2", "student-2")
                ));
        when(solapiClient.sendSms("01011112222", "공지")).thenReturn("provider-1");
        when(solapiClient.sendSms("01033334444", "공지")).thenReturn("provider-2");

        BulkMessageSendResponse response = service.send(workspace, new BulkMessageSendRequest(
                "all",
                null,
                null,
                "parent",
                "공지",
                true
        ));

        assertThat(response.dryRun()).isFalse();
        assertThat(response.message()).isEqualTo("전체문자를 발송했습니다.");
        verify(bulkMessageClient).insertBulkSentMessageLogs(eq("academy-1"), anyList(), anyList(), eq("sent"));
    }

    @Test
    void blocksTeacherRole() {
        WorkspaceContext workspace = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");

        assertThatThrownBy(() -> service.send(workspace, new BulkMessageSendRequest(
                "all",
                null,
                null,
                "parent",
                "공지",
                true
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("전체문자는 원장 또는 관리자만 보낼 수 있습니다.");
    }

    @Test
    void blocksOverLimitMessageBody() {
        WorkspaceContext workspace = new WorkspaceContext("owner-1", "academy-1", "owner", "active");

        assertThatThrownBy(() -> service.send(workspace, new BulkMessageSendRequest(
                "all",
                null,
                null,
                "parent",
                "가".repeat(1001),
                true
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("문자 본문은 2000byte 이하로 입력해 주세요.");
    }

    private void mockTargets() {
        when(bulkMessageClient.findClasses("academy-1")).thenReturn(List.of(
                new SupabaseBulkMessageClient.ClassRecord("class-1", "중2")
        ));
        when(bulkMessageClient.findActiveStudents("academy-1")).thenReturn(List.of(
                new SupabaseBulkMessageClient.StudentRecord("student-1", "class-1", "중2", "01011112222", null, "active"),
                new SupabaseBulkMessageClient.StudentRecord("student-2", "class-1", "중2", "01033334444", null, "active")
        ));
    }
}
