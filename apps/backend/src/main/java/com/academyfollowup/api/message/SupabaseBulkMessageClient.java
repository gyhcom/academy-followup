package com.academyfollowup.api.message;

import com.academyfollowup.api.global.supabase.SupabaseRestClient;
import com.academyfollowup.api.global.supabase.SupabaseRestException;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class SupabaseBulkMessageClient {

    private static final String CONFIG_ERROR = "백엔드 전체문자 미리보기 환경변수가 설정되지 않았습니다.";

    private final SupabaseRestClient supabaseRestClient;

    public SupabaseBulkMessageClient(SupabaseRestClient supabaseRestClient) {
        this.supabaseRestClient = supabaseRestClient;
    }

    public List<ClassRecord> findClasses(String academyId) {
        return getArray(
                "/rest/v1/classes?select=id,grade_label&academy_id=eq." + encode(academyId),
                ClassRecord[].class
        );
    }

    public List<StudentRecord> findActiveStudents(String academyId) {
        return getArray(
                "/rest/v1/students?select=id,class_id,grade_label,parent_phone,student_phone,status"
                        + "&academy_id=eq." + encode(academyId)
                        + "&status=eq.active",
                StudentRecord[].class
        );
    }

    public java.util.Optional<SettingsRecord> findSettings(String academyId) {
        return getArray(
                "/rest/v1/academy_settings?select=sms_dry_run"
                        + "&academy_id=eq." + encode(academyId)
                        + "&limit=1",
                SettingsRecord[].class
        ).stream().findFirst();
    }

    public List<CreatedFollowupRecord> insertBulkFollowups(
            String academyId,
            String teacherId,
            String messageBody,
            List<BulkMessageRecipient> recipients
    ) {
        List<Map<String, Object>> body = recipients.stream()
                .map(recipient -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("academy_id", academyId);
                    item.put("student_id", recipient.studentId());
                    item.put("class_id", recipient.classId());
                    item.put("teacher_id", teacherId);
                    item.put("reason", "consultation");
                    item.put("message_body", messageBody);
                    item.put("recipient_type", recipient.recipientType().value());
                    item.put("status", "draft");
                    return item;
                })
                .toList();

        return postArray(
                "/rest/v1/followups?select=id,student_id",
                body,
                CreatedFollowupRecord[].class,
                "return=representation",
                "전체문자 연락 기록 생성 중 오류가 발생했습니다."
        );
    }

    public void insertBulkMessageLogs(
            String academyId,
            List<CreatedFollowupRecord> followups,
            List<BulkMessageRecipient> recipients,
            String status
    ) {
        List<BulkSentMessageRecipient> sentRecipients = recipients.stream()
                .map(recipient -> BulkSentMessageRecipient.from(recipient, null))
                .toList();
        insertBulkSentMessageLogs(academyId, followups, sentRecipients, status);
    }

    public void insertBulkSentMessageLogs(
            String academyId,
            List<CreatedFollowupRecord> followups,
            List<BulkSentMessageRecipient> recipients,
            String status
    ) {
        List<Map<String, Object>> body = new java.util.ArrayList<>();
        for (int index = 0; index < recipients.size(); index++) {
            BulkSentMessageRecipient recipient = recipients.get(index);
            Map<String, Object> item = new HashMap<>();
            item.put("academy_id", academyId);
            item.put("followup_id", index < followups.size() ? followups.get(index).id() : null);
            item.put("provider", "solapi");
            item.put("provider_message_id", recipient.providerMessageId());
            item.put("recipient_phone", recipient.phone());
            item.put("recipient_type", recipient.recipientType().value());
            item.put("status", status);
            item.put("error_message", null);
            body.add(item);
        }

        postNoContent(
                "/rest/v1/message_logs",
                body,
                "return=minimal",
                "전체문자 발송 기록 저장 중 오류가 발생했습니다."
        );
    }

    public void updateFollowupsSent(String academyId, List<String> followupIds) {
        if (followupIds.isEmpty()) {
            return;
        }

        patchArray(
                "/rest/v1/followups?select=id"
                        + "&academy_id=eq." + encode(academyId)
                        + "&id=in.(" + followupIds.stream().map(this::encode).collect(java.util.stream.Collectors.joining(",")) + ")",
                Map.of(
                        "status", "sent",
                        "sent_at", Instant.now().toString()
                ),
                CreatedFollowupRecord[].class,
                "return=representation",
                "전체문자 연락 기록 상태 저장 중 오류가 발생했습니다."
        );
    }

    private <T> List<T> getArray(String path, Class<T[]> type) {
        try {
            return supabaseRestClient.getServiceArray(path, type, CONFIG_ERROR);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    CONFIG_ERROR.equals(exception.getMessage()) ? CONFIG_ERROR : "전체문자 대상 조회 중 오류가 발생했습니다."
            );
        }
    }

    private <T> List<T> postArray(
            String path,
            Object body,
            Class<T[]> type,
            String preferHeader,
            String errorMessage
    ) {
        try {
            return supabaseRestClient.postServiceArray(path, body, type, CONFIG_ERROR, preferHeader);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    CONFIG_ERROR.equals(exception.getMessage()) ? CONFIG_ERROR : errorMessage
            );
        }
    }

    private <T> List<T> patchArray(
            String path,
            Object body,
            Class<T[]> type,
            String preferHeader,
            String errorMessage
    ) {
        try {
            return supabaseRestClient.patchServiceArray(path, body, type, CONFIG_ERROR, preferHeader);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    CONFIG_ERROR.equals(exception.getMessage()) ? CONFIG_ERROR : errorMessage
            );
        }
    }

    private void postNoContent(String path, Object body, String preferHeader, String errorMessage) {
        try {
            supabaseRestClient.postServiceNoContent(path, body, CONFIG_ERROR, preferHeader);
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

    public record ClassRecord(String id, @JsonProperty("grade_label") String gradeLabel) {
    }

    public record StudentRecord(
            String id,
            @JsonProperty("class_id") String classId,
            @JsonProperty("grade_label") String gradeLabel,
            @JsonProperty("parent_phone") String parentPhone,
            @JsonProperty("student_phone") String studentPhone,
            String status
    ) {
    }

    public record SettingsRecord(@JsonProperty("sms_dry_run") Boolean smsDryRun) {
    }

    public record CreatedFollowupRecord(String id, @JsonProperty("student_id") String studentId) {
    }
}
