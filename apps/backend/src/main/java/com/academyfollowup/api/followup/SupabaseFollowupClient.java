package com.academyfollowup.api.followup;

import com.academyfollowup.api.global.supabase.SupabaseRestClient;
import com.academyfollowup.api.global.supabase.SupabaseRestException;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class SupabaseFollowupClient {

    private static final String CONFIG_ERROR = "백엔드 연락 기록 환경변수가 설정되지 않았습니다.";

    private final SupabaseRestClient supabaseRestClient;

    public SupabaseFollowupClient(SupabaseRestClient supabaseRestClient) {
        this.supabaseRestClient = supabaseRestClient;
    }

    public Optional<StudentRecord> findStudent(String academyId, String studentId) {
        return getArray(
                "/rest/v1/students?select=id,academy_id,class_id,name,status"
                        + "&academy_id=eq." + encode(academyId)
                        + "&id=eq." + encode(studentId)
                        + "&limit=1",
                StudentRecord[].class
        ).stream().findFirst();
    }

    public Optional<ClassRecord> findClass(String academyId, String classId) {
        return getArray(
                "/rest/v1/classes?select=id,academy_id,name,teacher_id"
                        + "&academy_id=eq." + encode(academyId)
                        + "&id=eq." + encode(classId)
                        + "&limit=1",
                ClassRecord[].class
        ).stream().findFirst();
    }

    public List<FollowupHistoryRecord> findHistory(String academyId, String studentId) {
        return getArray(
                "/rest/v1/followups?select=id,reason,message_body,recipient_type,status,sent_at,created_at"
                        + "&academy_id=eq." + encode(academyId)
                        + "&student_id=eq." + encode(studentId)
                        + "&order=created_at.desc"
                        + "&limit=8",
                FollowupHistoryRecord[].class
        );
    }

    public Optional<AttendanceRecord> findAttendanceRecord(String academyId, String attendanceRecordId) {
        return getArray(
                "/rest/v1/attendance_records?select=id,academy_id,student_id,class_id,status,followup_id"
                        + "&academy_id=eq." + encode(academyId)
                        + "&id=eq." + encode(attendanceRecordId)
                        + "&limit=1",
                AttendanceRecord[].class
        ).stream().findFirst();
    }

    public Optional<CreatedFollowupRecord> insertFollowup(
            String academyId,
            String studentId,
            String classId,
            String teacherId,
            String reason,
            String messageBody,
            String recipientType
    ) {
        Map<String, Object> body = new HashMap<>();
        body.put("academy_id", academyId);
        body.put("student_id", studentId);
        body.put("class_id", classId);
        body.put("teacher_id", teacherId);
        body.put("reason", reason);
        body.put("message_body", messageBody);
        body.put("recipient_type", recipientType);
        body.put("status", "draft");

        return postArray(
                "/rest/v1/followups?select=id,status,created_at",
                body,
                CreatedFollowupRecord[].class,
                "return=representation"
        ).stream().findFirst();
    }

    public void updateAttendanceFollowup(String academyId, String attendanceRecordId, String followupId) {
        patchArray(
                "/rest/v1/attendance_records?select=id"
                        + "&academy_id=eq." + encode(academyId)
                        + "&id=eq." + encode(attendanceRecordId),
                Map.of(
                        "followup_id", followupId,
                        "updated_at", Instant.now().toString()
                ),
                UpdatedAttendanceRecord[].class,
                "return=representation"
        );
    }

    private <T> List<T> getArray(String path, Class<T[]> type) {
        try {
            return supabaseRestClient.getServiceArray(path, type, CONFIG_ERROR);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    CONFIG_ERROR.equals(exception.getMessage()) ? CONFIG_ERROR : "연락 기록 조회 중 오류가 발생했습니다."
            );
        }
    }

    private <T> List<T> postArray(String path, Object body, Class<T[]> type, String preferHeader) {
        try {
            return supabaseRestClient.postServiceArray(path, body, type, CONFIG_ERROR, preferHeader);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    CONFIG_ERROR.equals(exception.getMessage()) ? CONFIG_ERROR : "연락 기록 저장 중 오류가 발생했습니다."
            );
        }
    }

    private <T> List<T> patchArray(String path, Object body, Class<T[]> type, String preferHeader) {
        try {
            return supabaseRestClient.patchServiceArray(path, body, type, CONFIG_ERROR, preferHeader);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    CONFIG_ERROR.equals(exception.getMessage()) ? CONFIG_ERROR : "출석 기록과 연락 기록 연결 중 오류가 발생했습니다."
            );
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public record StudentRecord(
            String id,
            @JsonProperty("academy_id") String academyId,
            @JsonProperty("class_id") String classId,
            String name,
            String status
    ) {
    }

    public record ClassRecord(
            String id,
            @JsonProperty("academy_id") String academyId,
            String name,
            @JsonProperty("teacher_id") String teacherId
    ) {
    }

    public record FollowupHistoryRecord(
            String id,
            String reason,
            @JsonProperty("message_body") String messageBody,
            @JsonProperty("recipient_type") String recipientType,
            String status,
            @JsonProperty("sent_at") String sentAt,
            @JsonProperty("created_at") String createdAt
    ) {
    }

    public record AttendanceRecord(
            String id,
            @JsonProperty("academy_id") String academyId,
            @JsonProperty("student_id") String studentId,
            @JsonProperty("class_id") String classId,
            String status,
            @JsonProperty("followup_id") String followupId
    ) {
    }

    public record CreatedFollowupRecord(
            String id,
            String status,
            @JsonProperty("created_at") String createdAt
    ) {
    }

    public record UpdatedAttendanceRecord(String id) {
    }
}
