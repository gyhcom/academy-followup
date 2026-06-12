package com.academyfollowup.api.message;

import com.academyfollowup.api.global.supabase.SupabaseRestClient;
import com.academyfollowup.api.global.supabase.SupabaseRestException;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class SupabaseMessageSendClient {

    private static final String CONFIG_ERROR = "백엔드 문자 발송 환경변수가 설정되지 않았습니다.";

    private final SupabaseRestClient supabaseRestClient;

    public SupabaseMessageSendClient(SupabaseRestClient supabaseRestClient) {
        this.supabaseRestClient = supabaseRestClient;
    }

    public Optional<FollowupRecord> findFollowup(String academyId, String followupId) {
        return getArray(
                "/rest/v1/followups?select=id,academy_id,student_id,class_id,reason,message_body,recipient_type,status,"
                        + "students(parent_phone,student_phone,status),classes(teacher_id)"
                        + "&academy_id=eq." + encode(academyId)
                        + "&id=eq." + encode(followupId)
                        + "&limit=1",
                FollowupRecord[].class,
                "연락 기록 조회 중 오류가 발생했습니다."
        ).stream().findFirst();
    }

    public Optional<SettingsRecord> findSettings(String academyId) {
        return getArray(
                "/rest/v1/academy_settings?select=allow_assistant_send,sms_dry_run,duplicate_guard_minutes"
                        + "&academy_id=eq." + encode(academyId)
                        + "&limit=1",
                SettingsRecord[].class,
                "문자 발송 설정 조회 중 오류가 발생했습니다."
        ).stream().findFirst();
    }

    public boolean hasDuplicateSentFollowup(
            String academyId,
            String studentId,
            String reason,
            String recipientType,
            String sentAtGte
    ) {
        return !getArray(
                "/rest/v1/followups?select=id"
                        + "&academy_id=eq." + encode(academyId)
                        + "&student_id=eq." + encode(studentId)
                        + "&reason=eq." + encode(reason)
                        + "&recipient_type=eq." + encode(recipientType)
                        + "&status=eq.sent"
                        + "&sent_at=gte." + encode(sentAtGte)
                        + "&limit=1",
                IdRecord[].class,
                "중복 발송 확인 중 오류가 발생했습니다."
        ).isEmpty();
    }

    public void insertMessageLogs(
            String academyId,
            String followupId,
            List<MessageRecipient> recipients,
            String status,
            String errorMessage
    ) {
        List<Map<String, Object>> body = recipients.stream()
                .map(recipient -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("academy_id", academyId);
                    item.put("followup_id", followupId);
                    item.put("provider", "solapi");
                    item.put("provider_message_id", recipient.providerMessageId());
                    item.put("recipient_phone", recipient.phone());
                    item.put("recipient_type", recipient.recipientType().value());
                    item.put("status", status);
                    item.put("error_message", errorMessage);
                    return item;
                })
                .toList();

        try {
            supabaseRestClient.postServiceNoContent(
                    "/rest/v1/message_logs",
                    body,
                    CONFIG_ERROR,
                    "return=minimal"
            );
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    CONFIG_ERROR.equals(exception.getMessage()) ? CONFIG_ERROR : "문자 발송 기록 저장 중 오류가 발생했습니다."
            );
        }
    }

    public void updateFollowupStatus(String academyId, String followupId, String status, String sentAt) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", status);
        body.put("sent_at", sentAt);

        patchArray(
                "/rest/v1/followups?select=id"
                        + "&academy_id=eq." + encode(academyId)
                        + "&id=eq." + encode(followupId),
                body,
                IdRecord[].class,
                "연락 기록 발송 상태 저장 중 오류가 발생했습니다."
        );
    }

    private <T> List<T> getArray(String path, Class<T[]> type, String errorMessage) {
        try {
            return supabaseRestClient.getServiceArray(path, type, CONFIG_ERROR);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    CONFIG_ERROR.equals(exception.getMessage()) ? CONFIG_ERROR : errorMessage
            );
        }
    }

    private <T> List<T> patchArray(String path, Object body, Class<T[]> type, String errorMessage) {
        try {
            return supabaseRestClient.patchServiceArray(path, body, type, CONFIG_ERROR, "return=representation");
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    CONFIG_ERROR.equals(exception.getMessage()) ? CONFIG_ERROR : errorMessage
            );
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public record FollowupRecord(
            String id,
            @JsonProperty("academy_id") String academyId,
            @JsonProperty("student_id") String studentId,
            @JsonProperty("class_id") String classId,
            String reason,
            @JsonProperty("message_body") String messageBody,
            @JsonProperty("recipient_type") String recipientType,
            String status,
            @JsonProperty("students") StudentRecord student,
            @JsonProperty("classes") ClassRecord classRecord
    ) {
    }

    public record StudentRecord(
            @JsonProperty("parent_phone") String parentPhone,
            @JsonProperty("student_phone") String studentPhone,
            String status
    ) {
    }

    public record ClassRecord(@JsonProperty("teacher_id") String teacherId) {
    }

    public record SettingsRecord(
            @JsonProperty("allow_assistant_send") Boolean allowAssistantSend,
            @JsonProperty("sms_dry_run") Boolean smsDryRun,
            @JsonProperty("duplicate_guard_minutes") Integer duplicateGuardMinutes
    ) {
    }

    public record IdRecord(String id) {
    }
}
