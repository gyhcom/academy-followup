package com.academyfollowup.api.attendance;

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
public class SupabaseAttendanceClient {

    private static final String CONFIG_ERROR = "백엔드 출석 환경변수가 설정되지 않았습니다.";
    private static final String ATTENDANCE_SELECT =
            "id,student_id,class_id,teacher_id,attendance_date,scheduled_start_time,scheduled_end_time,status,checked_at,arrived_at,note,followup_id,followups(status,sent_at)";

    private final SupabaseRestClient supabaseRestClient;

    public SupabaseAttendanceClient(SupabaseRestClient supabaseRestClient) {
        this.supabaseRestClient = supabaseRestClient;
    }

    public List<AttendanceRecord> findRecords(String academyId, String attendanceDate) {
        return getArray(
                "/rest/v1/attendance_records?select=" + ATTENDANCE_SELECT
                        + "&academy_id=eq." + encode(academyId)
                        + "&attendance_date=eq." + encode(attendanceDate)
                        + "&order=scheduled_start_time.asc",
                AttendanceRecord[].class
        );
    }

    public List<AttendanceRecord> findRecordsForClasses(String academyId, String attendanceDate, List<String> classIds) {
        if (classIds.isEmpty()) {
            return List.of();
        }

        String classFilter = classIds.stream().map(this::encode).reduce((left, right) -> left + "," + right).orElse("");
        return getArray(
                "/rest/v1/attendance_records?select=" + ATTENDANCE_SELECT
                        + "&academy_id=eq." + encode(academyId)
                        + "&attendance_date=eq." + encode(attendanceDate)
                        + "&class_id=in.(" + classFilter + ")"
                        + "&order=scheduled_start_time.asc",
                AttendanceRecord[].class
        );
    }

    public List<ClassIdRecord> findAssignedClassIds(String academyId, String teacherId) {
        return getArray(
                "/rest/v1/classes?select=id"
                        + "&academy_id=eq." + encode(academyId)
                        + "&teacher_id=eq." + encode(teacherId),
                ClassIdRecord[].class
        );
    }

    public Optional<ClassRecord> findClass(String academyId, String classId) {
        return getArray(
                "/rest/v1/classes?select=id,teacher_id"
                        + "&academy_id=eq." + encode(academyId)
                        + "&id=eq." + encode(classId)
                        + "&limit=1",
                ClassRecord[].class
        ).stream().findFirst();
    }

    public Optional<StudentRecord> findStudent(String academyId, String studentId) {
        return getArray(
                "/rest/v1/students?select=id,class_id,status"
                        + "&academy_id=eq." + encode(academyId)
                        + "&id=eq." + encode(studentId)
                        + "&limit=1",
                StudentRecord[].class
        ).stream().findFirst();
    }

    public Optional<AttendanceRecord> upsertAttendance(
            String academyId,
            String teacherId,
            AttendancePayload payload,
            String checkedAt,
            String arrivedAt
    ) {
        Map<String, Object> body = new HashMap<>();
        body.put("academy_id", academyId);
        body.put("student_id", payload.studentId());
        body.put("class_id", payload.classId());
        body.put("teacher_id", teacherId);
        body.put("attendance_date", payload.attendanceDate());
        body.put("scheduled_start_time", payload.scheduledStartTime());
        body.put("scheduled_end_time", payload.scheduledEndTime());
        body.put("status", payload.status().value());
        body.put("checked_at", checkedAt);
        body.put("arrived_at", arrivedAt);
        body.put("note", payload.note());
        body.put("updated_at", Instant.now().toString());

        return postArray(
                "/rest/v1/attendance_records?on_conflict=academy_id,student_id,class_id,attendance_date,scheduled_start_time,scheduled_end_time"
                        + "&select=" + ATTENDANCE_SELECT,
                body,
                AttendanceRecord[].class,
                "resolution=merge-duplicates,return=representation"
        ).stream().findFirst();
    }

    private <T> List<T> getArray(String path, Class<T[]> type) {
        try {
            return supabaseRestClient.getServiceArray(path, type, CONFIG_ERROR);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    CONFIG_ERROR.equals(exception.getMessage()) ? CONFIG_ERROR : "출석 기록 조회 중 오류가 발생했습니다."
            );
        }
    }

    private <T> List<T> postArray(String path, Object body, Class<T[]> type, String preferHeader) {
        try {
            return supabaseRestClient.postServiceArray(path, body, type, CONFIG_ERROR, preferHeader);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    CONFIG_ERROR.equals(exception.getMessage()) ? CONFIG_ERROR : "출석 상태 저장 중 오류가 발생했습니다."
            );
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public record ClassIdRecord(String id) {
    }

    public record ClassRecord(String id, @JsonProperty("teacher_id") String teacherId) {
    }

    public record StudentRecord(
            String id,
            @JsonProperty("class_id") String classId,
            String status
    ) {
    }

    public record FollowupRecord(String status, @JsonProperty("sent_at") String sentAt) {
    }

    public record AttendanceRecord(
            String id,
            @JsonProperty("student_id") String studentId,
            @JsonProperty("class_id") String classId,
            @JsonProperty("teacher_id") String teacherId,
            @JsonProperty("attendance_date") String attendanceDate,
            @JsonProperty("scheduled_start_time") String scheduledStartTime,
            @JsonProperty("scheduled_end_time") String scheduledEndTime,
            String status,
            @JsonProperty("checked_at") String checkedAt,
            @JsonProperty("arrived_at") String arrivedAt,
            String note,
            @JsonProperty("followup_id") String followupId,
            List<FollowupRecord> followups
    ) {
    }
}
