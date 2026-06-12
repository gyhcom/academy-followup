package com.academyfollowup.api.message;

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
class MessageApiSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SupabaseAuthService supabaseAuthService;

    @MockBean
    private MessageTemplateService messageTemplateService;

    @MockBean
    private MessagePreviewService messagePreviewService;

    @MockBean
    private BulkMessagePreviewService bulkMessagePreviewService;

    @MockBean
    private SendMessageService sendMessageService;

    @MockBean
    private BulkMessageSendService bulkMessageSendService;

    @Test
    void messageTemplatesRequireBearerToken() throws Exception {
        mockMvc.perform(get("/api/message-templates"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("로그인이 필요합니다."));
    }

    @Test
    void returnsMessageTemplatesForOwner() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("user-1", "academy-1", "owner", "active");
        when(supabaseAuthService.resolveWorkspace("owner-token")).thenReturn(workspaceContext);
        when(messageTemplateService.findTemplates(eq(workspaceContext))).thenReturn(List.of(
                new MessageTemplateResponse.MessageTemplateItem(
                        "template-1",
                        "absence",
                        "결석",
                        "결석 안내",
                        "결석했습니다.",
                        true
                )
        ));

        mockMvc.perform(get("/api/message-templates").header("Authorization", "Bearer owner-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.templates[0].id").value("template-1"))
                .andExpect(jsonPath("$.templates[0].reason").value("absence"));
    }

    @Test
    void blocksTeacherFromMessageTemplates() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("user-1", "academy-1", "teacher", "active");
        when(supabaseAuthService.resolveWorkspace("teacher-token")).thenReturn(workspaceContext);
        when(messageTemplateService.findTemplates(eq(workspaceContext))).thenThrow(new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "문자 템플릿 관리는 원장 또는 관리자만 할 수 있습니다."
        ));

        mockMvc.perform(get("/api/message-templates").header("Authorization", "Bearer teacher-token"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("문자 템플릿 관리는 원장 또는 관리자만 할 수 있습니다."));
    }

    @Test
    void returnsMessagePreviewForTeacher() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");
        when(supabaseAuthService.resolveWorkspace("teacher-token")).thenReturn(workspaceContext);
        when(messagePreviewService.preview(eq(workspaceContext), any(MessagePreviewRequest.class))).thenReturn(
                new MessagePreviewResponse(
                        "template-1",
                        "결석 안내",
                        "결석 문자",
                        new MessageLengthMetrics(5, 10, "sms", false, false),
                        "absence",
                        new MessagePreviewResponse.StudentItem("student-1", "김민준")
                )
        );

        mockMvc.perform(post("/api/messages/preview")
                        .header("Authorization", "Bearer teacher-token")
                        .contentType("application/json")
                        .content("{\"studentId\":\"student-1\",\"reason\":\"absence\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("결석 안내"))
                .andExpect(jsonPath("$.body").value("결석 문자"))
                .andExpect(jsonPath("$.metrics.transportType").value("sms"));
    }

    @Test
    void returnsBulkPreviewForOwner() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(supabaseAuthService.resolveWorkspace("owner-token")).thenReturn(workspaceContext);
        when(bulkMessagePreviewService.preview(eq(workspaceContext), any(BulkMessagePreviewRequest.class)))
                .thenReturn(new BulkMessagePreviewResponse(200, 220, 200, 20));

        mockMvc.perform(post("/api/bulk-messages/preview")
                        .header("Authorization", "Bearer owner-token")
                        .contentType("application/json")
                        .content("{\"targetType\":\"all\",\"recipientType\":\"parent\",\"excludeDuplicateRecipients\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.targetStudentCount").value(200))
                .andExpect(jsonPath("$.duplicateExcludedCount").value(20));
    }

    @Test
    void blocksTeacherFromBulkPreview() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");
        when(supabaseAuthService.resolveWorkspace("teacher-token")).thenReturn(workspaceContext);
        when(bulkMessagePreviewService.preview(eq(workspaceContext), any(BulkMessagePreviewRequest.class)))
                .thenThrow(new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "전체문자는 원장 또는 관리자만 확인할 수 있습니다."
                ));

        mockMvc.perform(post("/api/bulk-messages/preview")
                        .header("Authorization", "Bearer teacher-token")
                        .contentType("application/json")
                        .content("{\"targetType\":\"all\",\"recipientType\":\"parent\",\"excludeDuplicateRecipients\":true}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("전체문자는 원장 또는 관리자만 확인할 수 있습니다."));
    }

    @Test
    void sendsBulkMessageForOwner() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(supabaseAuthService.resolveWorkspace("owner-token")).thenReturn(workspaceContext);
        when(bulkMessageSendService.send(eq(workspaceContext), any(BulkMessageSendRequest.class)))
                .thenReturn(new BulkMessageSendResponse(true, "전체문자 테스트 발송 기록을 저장했습니다.", 10, 10, 10, 0));

        mockMvc.perform(post("/api/bulk-messages/send")
                        .header("Authorization", "Bearer owner-token")
                        .contentType("application/json")
                        .content("{\"targetType\":\"all\",\"recipientType\":\"parent\",\"messageBody\":\"공지\",\"excludeDuplicateRecipients\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dryRun").value(true))
                .andExpect(jsonPath("$.recipientCount").value(10));
    }

    @Test
    void sendsFollowupMessageForOwner() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(supabaseAuthService.resolveWorkspace("owner-token")).thenReturn(workspaceContext);
        when(sendMessageService.send(eq(workspaceContext), any(SendMessageRequest.class))).thenReturn(
                SendMessageResponse.sent(
                        true,
                        "SMS_DRY_RUN이 활성화되어 실제 문자를 발송하지 않았습니다.",
                        "010-****-5678",
                        1,
                        "followup-1"
                )
        );

        mockMvc.perform(post("/api/messages/send")
                        .header("Authorization", "Bearer owner-token")
                        .contentType("application/json")
                        .content("{\"followupId\":\"followup-1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dryRun").value(true))
                .andExpect(jsonPath("$.followupId").value("followup-1"));
    }

    @Test
    void returnsDuplicateSendConflict() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(supabaseAuthService.resolveWorkspace("owner-token")).thenReturn(workspaceContext);
        when(sendMessageService.send(eq(workspaceContext), any(SendMessageRequest.class))).thenThrow(
                new DuplicateMessageException("최근 발송 기록이 있어 중복 발송을 차단했습니다.", 1440)
        );

        mockMvc.perform(post("/api/messages/send")
                        .header("Authorization", "Bearer owner-token")
                        .contentType("application/json")
                        .content("{\"followupId\":\"followup-1\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.duplicate").value(true))
                .andExpect(jsonPath("$.duplicateGuardMinutes").value(1440));
    }
}
