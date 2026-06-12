package com.academyfollowup.api.report;

import com.academyfollowup.api.global.supabase.SupabaseRestClient;
import com.academyfollowup.api.global.supabase.SupabaseRestException;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class SupabaseReportExportClient {

    private static final String CONFIG_ERROR_MESSAGE = "백엔드 리포트 내보내기 환경변수가 설정되지 않았습니다.";

    private final SupabaseRestClient supabaseRestClient;

    public SupabaseReportExportClient(SupabaseRestClient supabaseRestClient) {
        this.supabaseRestClient = supabaseRestClient;
    }

    public List<StudentExportRecord> findStudents(String academyId) {
        return getArray(
                "/rest/v1/students?select=name,school_name,grade_label,parent_name,parent_phone,student_phone,status,schedule_share_consent_confirmed,classes(name)"
                        + "&academy_id=eq." + encode(academyId)
                        + "&order=name.asc",
                StudentExportRecord[].class
        );
    }

    public List<AttendanceExportRecord> findAttendance(String academyId, ReportRangeBounds bounds) {
        return getArray(
                "/rest/v1/attendance_records?select=attendance_date,scheduled_start_time,scheduled_end_time,status,note,checked_at,arrived_at,students(name),classes(name)"
                        + "&academy_id=eq." + encode(academyId)
                        + "&attendance_date=gte." + encode(bounds.startDate())
                        + "&attendance_date=lte." + encode(bounds.endDate())
                        + "&order=attendance_date.desc"
                        + "&order=scheduled_start_time.asc",
                AttendanceExportRecord[].class
        );
    }

    public List<FollowupExportRecord> findFollowups(String academyId, ReportRangeBounds bounds) {
        return getArray(
                "/rest/v1/followups?select=id,reason,message_body,recipient_type,status,sent_at,created_at,students(name,parent_phone,student_phone),classes(name)"
                        + "&academy_id=eq." + encode(academyId)
                        + "&created_at=gte." + encode(bounds.startDateTime())
                        + "&created_at=lt." + encode(bounds.endDateTime())
                        + "&order=created_at.desc",
                FollowupExportRecord[].class
        );
    }

    public List<MessageLogExportRecord> findMessageLogs(String academyId, List<String> followupIds) {
        if (followupIds.isEmpty()) {
            return List.of();
        }

        String idFilter = followupIds.stream()
                .map(this::encode)
                .reduce((left, right) -> left + "," + right)
                .orElse("");

        return getArray(
                "/rest/v1/message_logs?select=followup_id,provider,recipient_type,recipient_phone,status,error_message,created_at"
                        + "&academy_id=eq." + encode(academyId)
                        + "&followup_id=in.(" + idFilter + ")",
                MessageLogExportRecord[].class
        );
    }

    public List<AuditExportRecord> findAuditLogs(String academyId, ReportRangeBounds bounds) {
        return getArray(
                "/rest/v1/audit_logs?select=actor_user_id,action,entity_type,entity_id,summary,created_at"
                        + "&academy_id=eq." + encode(academyId)
                        + "&created_at=gte." + encode(bounds.startDateTime())
                        + "&created_at=lt." + encode(bounds.endDateTime())
                        + "&order=created_at.desc",
                AuditExportRecord[].class
        );
    }

    public List<MemberRecord> findMembers(String academyId) {
        return getArray(
                "/rest/v1/profiles?select=id,name&academy_id=eq." + encode(academyId),
                MemberRecord[].class
        );
    }

    private <T> List<T> getArray(String path, Class<T[]> responseType) {
        try {
            return supabaseRestClient.getServiceArray(path, responseType, CONFIG_ERROR_MESSAGE);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    exception.getMessage().equals(CONFIG_ERROR_MESSAGE)
                            ? CONFIG_ERROR_MESSAGE
                            : "운영 리포트 CSV를 만드는 중 오류가 발생했습니다."
            );
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public record StudentExportRecord(
            String name,
            @JsonProperty("school_name") String schoolName,
            @JsonProperty("grade_label") String gradeLabel,
            @JsonProperty("parent_name") String parentName,
            @JsonProperty("parent_phone") String parentPhone,
            @JsonProperty("student_phone") String studentPhone,
            String status,
            @JsonProperty("schedule_share_consent_confirmed") boolean scheduleShareConsentConfirmed,
            ClassName classes
    ) {
    }

    public record AttendanceExportRecord(
            @JsonProperty("attendance_date") String attendanceDate,
            @JsonProperty("scheduled_start_time") String scheduledStartTime,
            @JsonProperty("scheduled_end_time") String scheduledEndTime,
            String status,
            String note,
            @JsonProperty("checked_at") String checkedAt,
            @JsonProperty("arrived_at") String arrivedAt,
            StudentName students,
            ClassName classes
    ) {
    }

    public record FollowupExportRecord(
            String id,
            String reason,
            @JsonProperty("message_body") String messageBody,
            @JsonProperty("recipient_type") String recipientType,
            String status,
            @JsonProperty("sent_at") String sentAt,
            @JsonProperty("created_at") String createdAt,
            StudentContact students,
            ClassName classes
    ) {
    }

    public record MessageLogExportRecord(
            @JsonProperty("followup_id") String followupId,
            String provider,
            @JsonProperty("recipient_type") String recipientType,
            @JsonProperty("recipient_phone") String recipientPhone,
            String status,
            @JsonProperty("error_message") String errorMessage,
            @JsonProperty("created_at") String createdAt
    ) {
    }

    public record AuditExportRecord(
            @JsonProperty("actor_user_id") String actorUserId,
            String action,
            @JsonProperty("entity_type") String entityType,
            @JsonProperty("entity_id") String entityId,
            String summary,
            @JsonProperty("created_at") String createdAt
    ) {
    }

    public record MemberRecord(String id, String name) {
    }

    public record ClassName(String name) {
    }

    public record StudentName(String name) {
    }

    public record StudentContact(
            String name,
            @JsonProperty("parent_phone") String parentPhone,
            @JsonProperty("student_phone") String studentPhone
    ) {
    }
}
