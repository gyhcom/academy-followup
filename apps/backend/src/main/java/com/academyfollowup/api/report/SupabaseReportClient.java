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
public class SupabaseReportClient {

    private static final String CONFIG_ERROR_MESSAGE = "백엔드 리포트 환경변수가 설정되지 않았습니다.";

    private final SupabaseRestClient supabaseRestClient;

    public SupabaseReportClient(SupabaseRestClient supabaseRestClient) {
        this.supabaseRestClient = supabaseRestClient;
    }

    public List<AttendanceRecord> findAttendance(String academyId, ReportRangeBounds range) {
        return getArray(
                "/rest/v1/attendance_records?select=status"
                        + "&academy_id=eq." + encode(academyId)
                        + "&attendance_date=gte." + encode(range.startDate())
                        + "&attendance_date=lte." + encode(range.endDate()),
                AttendanceRecord[].class
        );
    }

    public List<FollowupRecord> findFollowups(String academyId, ReportRangeBounds range) {
        return getArray(
                "/rest/v1/followups?select=message_body"
                        + "&academy_id=eq." + encode(academyId)
                        + "&created_at=gte." + encode(range.startDateTime())
                        + "&created_at=lt." + encode(range.endDateTime()),
                FollowupRecord[].class
        );
    }

    public List<MessageLogRecord> findMessageLogs(String academyId, ReportRangeBounds range) {
        return getArray(
                "/rest/v1/message_logs?select=status"
                        + "&academy_id=eq." + encode(academyId)
                        + "&created_at=gte." + encode(range.startDateTime())
                        + "&created_at=lt." + encode(range.endDateTime()),
                MessageLogRecord[].class
        );
    }

    public List<StudentRecord> findStudents(String academyId) {
        return getArray(
                "/rest/v1/students?select=id,status&academy_id=eq." + encode(academyId),
                StudentRecord[].class
        );
    }

    public List<ClassRecord> findClasses(String academyId) {
        return getArray(
                "/rest/v1/classes?select=id&academy_id=eq." + encode(academyId),
                ClassRecord[].class
        );
    }

    public List<ScheduleRecord> findActiveSchedules(String academyId) {
        return getArray(
                "/rest/v1/student_schedules?select=student_id,is_active"
                        + "&academy_id=eq." + encode(academyId)
                        + "&is_active=eq.true",
                ScheduleRecord[].class
        );
    }

    public List<AuditRecord> findAuditLogs(String academyId, ReportRangeBounds range) {
        return getArray(
                "/rest/v1/audit_logs?select=id"
                        + "&academy_id=eq." + encode(academyId)
                        + "&created_at=gte." + encode(range.startDateTime())
                        + "&created_at=lt." + encode(range.endDateTime()),
                AuditRecord[].class
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
                            : "운영 리포트 조회 중 오류가 발생했습니다."
            );
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public record AttendanceRecord(String status) {
    }

    public record FollowupRecord(@JsonProperty("message_body") String messageBody) {
    }

    public record MessageLogRecord(String status) {
    }

    public record StudentRecord(String id, String status) {
    }

    public record ClassRecord(String id) {
    }

    public record ScheduleRecord(@JsonProperty("student_id") String studentId, @JsonProperty("is_active") boolean active) {
    }

    public record AuditRecord(String id) {
    }
}
