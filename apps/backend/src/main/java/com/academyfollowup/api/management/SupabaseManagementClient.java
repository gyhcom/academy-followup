package com.academyfollowup.api.management;

import com.academyfollowup.api.global.supabase.SupabaseRestClient;
import com.academyfollowup.api.global.supabase.SupabaseRestException;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class SupabaseManagementClient {

    private static final String CONFIG_ERROR = "백엔드 관리 환경변수가 설정되지 않았습니다.";
    private static final String STUDENT_SELECT =
            "id,academy_id,class_id,name,school_name,grade_label,parent_name,parent_phone,student_phone,schedule_share_consent_confirmed,status";
    private static final String CLASS_SELECT = "id,name,subject,grade_label,teacher_id";
    private static final String SCHEDULE_SELECT =
            "id,student_id,class_id,teacher_id,schedule_type,schedule_date,day_of_week,start_time,end_time,subject,title,memo,is_active,source_followup_id";

    private final SupabaseRestClient supabaseRestClient;

    public SupabaseManagementClient(SupabaseRestClient supabaseRestClient) {
        this.supabaseRestClient = supabaseRestClient;
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

    public List<ClassRecord> findClasses(String academyId) {
        return getArray(
                "/rest/v1/classes?select=id,academy_id,name,subject,grade_label,teacher_id"
                        + "&academy_id=eq." + encode(academyId),
                ClassRecord[].class
        );
    }

    public Optional<ProfileRecord> findProfile(String academyId, String userId) {
        return getArray(
                "/rest/v1/profiles?select=id,academy_id,role,status"
                        + "&academy_id=eq." + encode(academyId)
                        + "&id=eq." + encode(userId)
                        + "&limit=1",
                ProfileRecord[].class
        ).stream().findFirst();
    }

    public Optional<StudentRecord> findStudent(String academyId, String studentId) {
        return getArray(
                "/rest/v1/students?select=" + STUDENT_SELECT
                        + "&academy_id=eq." + encode(academyId)
                        + "&id=eq." + encode(studentId)
                        + "&limit=1",
                StudentRecord[].class
        ).stream().findFirst();
    }

    public List<StudentRecord> findStudents(String academyId) {
        return getArray(
                "/rest/v1/students?select=" + STUDENT_SELECT
                        + "&academy_id=eq." + encode(academyId),
                StudentRecord[].class
        );
    }

    public List<StudentRecord> findActiveStudentsByClass(String academyId, String classId) {
        return getArray(
                "/rest/v1/students?select=" + STUDENT_SELECT
                        + "&academy_id=eq." + encode(academyId)
                        + "&class_id=eq." + encode(classId)
                        + "&status=eq.active",
                StudentRecord[].class
        );
    }

    public Optional<FollowupRecord> findFollowup(String academyId, String followupId) {
        return getArray(
                "/rest/v1/followups?select=id,student_id"
                        + "&academy_id=eq." + encode(academyId)
                        + "&id=eq." + encode(followupId)
                        + "&limit=1",
                FollowupRecord[].class
        ).stream().findFirst();
    }

    public Optional<IdRecord> findDuplicateOneOffSchedule(
            String academyId,
            StudentSchedulePayload payload
    ) {
        if (payload.scheduleDate() == null
                || !"makeup".equals(payload.scheduleType())
                || !payload.isActive()) {
            return Optional.empty();
        }

        return getArray(
                "/rest/v1/student_schedules?select=id"
                        + "&academy_id=eq." + encode(academyId)
                        + "&student_id=eq." + encode(payload.studentId())
                        + "&schedule_type=eq." + encode(payload.scheduleType())
                        + "&schedule_date=eq." + encode(payload.scheduleDate())
                        + "&start_time=eq." + encode(payload.startTime())
                        + "&end_time=eq." + encode(payload.endTime())
                        + "&is_active=eq.true"
                        + "&limit=1",
                IdRecord[].class
        ).stream().findFirst();
    }

    public ClassRecord insertClass(String academyId, ClassPayload payload) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("academy_id", academyId);
        body.put("name", payload.name());
        body.put("subject", payload.subject());
        body.put("grade_label", payload.gradeLabel());
        body.put("teacher_id", payload.teacherId());

        return postArray(
                "/rest/v1/classes?select=" + CLASS_SELECT,
                body,
                ClassRecord[].class,
                "return=representation"
        ).stream().findFirst().orElseThrow(() -> saveError("반 정보를 저장하지 못했습니다."));
    }

    public Optional<ClassRecord> updateClass(String academyId, ClassPayload payload) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", payload.name());
        body.put("subject", payload.subject());
        body.put("grade_label", payload.gradeLabel());
        body.put("teacher_id", payload.teacherId());

        return patchArray(
                "/rest/v1/classes?select=" + CLASS_SELECT
                        + "&academy_id=eq." + encode(academyId)
                        + "&id=eq." + encode(payload.classId()),
                body,
                ClassRecord[].class,
                "return=representation"
        ).stream().findFirst();
    }

    public StudentRecord insertStudent(String academyId, String userId, StudentPayload payload) {
        Map<String, Object> body = studentBody(academyId, userId, payload);
        return postArray(
                "/rest/v1/students?select=" + STUDENT_SELECT,
                body,
                StudentRecord[].class,
                "return=representation"
        ).stream().findFirst().orElseThrow(() -> saveError("학생 정보를 저장하지 못했습니다."));
    }

    public List<StudentRecord> insertStudents(
            String academyId,
            String userId,
            List<StudentPayload> payloads
    ) {
        List<Map<String, Object>> body = payloads.stream()
                .map((payload) -> studentBody(academyId, userId, payload))
                .toList();
        return postArray(
                "/rest/v1/students?select=" + STUDENT_SELECT,
                body,
                StudentRecord[].class,
                "return=representation"
        );
    }

    public Optional<StudentRecord> updateStudent(String academyId, String userId, StudentPayload payload) {
        Map<String, Object> body = studentBody(academyId, userId, payload);
        body.remove("academy_id");

        return patchArray(
                "/rest/v1/students?select=" + STUDENT_SELECT
                        + "&academy_id=eq." + encode(academyId)
                        + "&id=eq." + encode(payload.studentId()),
                body,
                StudentRecord[].class,
                "return=representation"
        ).stream().findFirst();
    }

    public ScheduleRecord insertSchedule(String academyId, StudentSchedulePayload payload) {
        Map<String, Object> body = scheduleBody(academyId, payload);
        return postArray(
                "/rest/v1/student_schedules?select=" + SCHEDULE_SELECT,
                body,
                ScheduleRecord[].class,
                "return=representation"
        ).stream().findFirst().orElseThrow(() -> saveError("스케줄을 저장하지 못했습니다."));
    }

    public List<ScheduleRecord> findDuplicateClassSchedules(
            String academyId,
            String classId,
            String scheduleType,
            List<Integer> dayOfWeeks,
            String startTime,
            String endTime,
            List<String> studentIds
    ) {
        if (dayOfWeeks.isEmpty() || studentIds.isEmpty()) {
            return List.of();
        }

        String dayFilter = String.join(",", dayOfWeeks.stream().map(String::valueOf).toList());
        String studentFilter = String.join(",", studentIds.stream().map(this::encode).toList());
        return getArray(
                "/rest/v1/student_schedules?select=" + SCHEDULE_SELECT
                        + "&academy_id=eq." + encode(academyId)
                        + "&class_id=eq." + encode(classId)
                        + "&schedule_type=eq." + encode(scheduleType)
                        + "&day_of_week=in.(" + dayFilter + ")"
                        + "&start_time=eq." + encode(startTime)
                        + "&end_time=eq." + encode(endTime)
                        + "&is_active=eq.true"
                        + "&schedule_date=is.null"
                        + "&student_id=in.(" + studentFilter + ")",
                ScheduleRecord[].class
        );
    }

    public void insertSchedules(String academyId, List<StudentSchedulePayload> payloads) {
        List<Map<String, Object>> body = payloads.stream()
                .map((payload) -> scheduleBody(academyId, payload))
                .toList();
        postArray(
                "/rest/v1/student_schedules?select=id",
                body,
                IdRecord[].class,
                "return=representation"
        );
    }

    public Optional<ScheduleRecord> updateSchedule(String academyId, StudentSchedulePayload payload) {
        Map<String, Object> body = scheduleBody(academyId, payload);
        body.remove("academy_id");
        body.put("updated_at", Instant.now().toString());

        return patchArray(
                "/rest/v1/student_schedules?select=" + SCHEDULE_SELECT
                        + "&academy_id=eq." + encode(academyId)
                        + "&id=eq." + encode(payload.scheduleId()),
                body,
                ScheduleRecord[].class,
                "return=representation"
        ).stream().findFirst();
    }

    public List<ScheduleLinkRecord> findActiveScheduleLinks(String academyId, String studentId, boolean source) {
        String academyColumn = source ? "source_academy_id" : "target_academy_id";
        String studentColumn = source ? "source_student_id" : "target_student_id";
        return getArray(
                "/rest/v1/student_schedule_links?select=id,source_academy_id,source_student_id,target_academy_id,target_student_id"
                        + "&" + academyColumn + "=eq." + encode(academyId)
                        + "&" + studentColumn + "=eq." + encode(studentId)
                        + "&status=eq.active",
                ScheduleLinkRecord[].class
        );
    }

    public List<StudentRecord> findStudentsByIds(List<String> studentIds) {
        if (studentIds.isEmpty()) {
            return List.of();
        }

        return getArray(
                "/rest/v1/students?select=" + STUDENT_SELECT
                        + "&id=in.(" + String.join(",", studentIds.stream().map(this::encode).toList()) + ")",
                StudentRecord[].class
        );
    }

    public List<StudentRecord> findShareCandidates(String academyId) {
        return getArray(
                "/rest/v1/students?select=" + STUDENT_SELECT
                        + "&academy_id=neq." + encode(academyId)
                        + "&status=eq.active"
                        + "&schedule_share_consent_confirmed=eq.true",
                StudentRecord[].class
        );
    }

    public void revokeScheduleLinks(List<String> linkIds, String userId) {
        if (linkIds.isEmpty()) {
            return;
        }

        patchArray(
                "/rest/v1/student_schedule_links?id=in.(" + String.join(",", linkIds.stream().map(this::encode).toList()) + ")",
                Map.of(
                        "status", "revoked",
                        "revoked_at", Instant.now().toString(),
                        "revoked_by", userId
                ),
                IdRecord[].class,
                "return=minimal"
        );
    }

    public boolean hasScheduleLink(String sourceStudentId, String targetStudentId) {
        return getArray(
                "/rest/v1/student_schedule_links?select=id"
                        + "&source_student_id=eq." + encode(sourceStudentId)
                        + "&target_student_id=eq." + encode(targetStudentId)
                        + "&status=eq.active"
                        + "&limit=1",
                IdRecord[].class
        ).stream().findFirst().isPresent();
    }

    public void insertScheduleLink(String academyId, String studentId, StudentRecord candidate, String userId) {
        postArray(
                "/rest/v1/student_schedule_links?select=id",
                Map.of(
                        "source_academy_id", academyId,
                        "source_student_id", studentId,
                        "target_academy_id", candidate.academyId(),
                        "target_student_id", candidate.id(),
                        "status", "active",
                        "consent_method", "manual",
                        "created_by", userId
                ),
                IdRecord[].class,
                "return=representation"
        );
    }

    private Map<String, Object> studentBody(String academyId, String userId, StudentPayload payload) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("academy_id", academyId);
        body.put("class_id", payload.classId());
        body.put("name", payload.name());
        body.put("school_name", payload.schoolName());
        body.put("grade_label", payload.gradeLabel());
        body.put("parent_name", payload.parentName());
        body.put("parent_phone", payload.parentPhone());
        body.put("student_phone", payload.studentPhone());
        body.put("schedule_share_consent_confirmed", payload.scheduleShareConsentConfirmed());
        body.put("schedule_share_consent_confirmed_at", payload.scheduleShareConsentConfirmed() ? Instant.now().toString() : null);
        body.put("schedule_share_consent_confirmed_by", payload.scheduleShareConsentConfirmed() ? userId : null);
        body.put("status", payload.status());
        return body;
    }

    private Map<String, Object> scheduleBody(String academyId, StudentSchedulePayload payload) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("academy_id", academyId);
        body.put("student_id", payload.studentId());
        body.put("class_id", payload.classId());
        body.put("teacher_id", payload.teacherId());
        body.put("schedule_type", payload.scheduleType());
        body.put("schedule_date", payload.scheduleDate());
        body.put("day_of_week", payload.dayOfWeek());
        body.put("start_time", payload.startTime());
        body.put("end_time", payload.endTime());
        body.put("subject", payload.subject());
        body.put("title", payload.title());
        body.put("memo", payload.memo());
        body.put("is_active", payload.isActive());
        body.put("source_followup_id", payload.sourceFollowupId());
        return body;
    }

    private <T> List<T> getArray(String path, Class<T[]> type) {
        try {
            return supabaseRestClient.getServiceArray(path, type, CONFIG_ERROR);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, errorMessage(exception, "관리 데이터 조회 중 오류가 발생했습니다."));
        }
    }

    private <T> List<T> postArray(String path, Object body, Class<T[]> type, String preferHeader) {
        try {
            return supabaseRestClient.postServiceArray(path, body, type, CONFIG_ERROR, preferHeader);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, errorMessage(exception, "관리 데이터 저장 중 오류가 발생했습니다."));
        }
    }

    private <T> List<T> patchArray(String path, Object body, Class<T[]> type, String preferHeader) {
        try {
            return supabaseRestClient.patchServiceArray(path, body, type, CONFIG_ERROR, preferHeader);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, errorMessage(exception, "관리 데이터 수정 중 오류가 발생했습니다."));
        }
    }

    private String errorMessage(SupabaseRestException exception, String fallback) {
        return CONFIG_ERROR.equals(exception.getMessage()) ? CONFIG_ERROR : fallback;
    }

    private ResponseStatusException saveError(String message) {
        return new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, message);
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public record IdRecord(String id) {
    }

    public record ProfileRecord(String id, @JsonProperty("academy_id") String academyId, String role, String status) {
    }

    public record ClassRecord(
            String id,
            @JsonProperty("academy_id") String academyId,
            String name,
            String subject,
            @JsonProperty("grade_label") String gradeLabel,
            @JsonProperty("teacher_id") String teacherId
    ) {
    }

    public record StudentRecord(
            String id,
            @JsonProperty("academy_id") String academyId,
            @JsonProperty("class_id") String classId,
            String name,
            @JsonProperty("school_name") String schoolName,
            @JsonProperty("grade_label") String gradeLabel,
            @JsonProperty("parent_name") String parentName,
            @JsonProperty("parent_phone") String parentPhone,
            @JsonProperty("student_phone") String studentPhone,
            @JsonProperty("schedule_share_consent_confirmed") boolean scheduleShareConsentConfirmed,
            String status
    ) {
    }

    public record FollowupRecord(String id, @JsonProperty("student_id") String studentId) {
    }

    public record ScheduleRecord(
            String id,
            @JsonProperty("student_id") String studentId,
            @JsonProperty("class_id") String classId,
            @JsonProperty("teacher_id") String teacherId,
            @JsonProperty("schedule_type") String scheduleType,
            @JsonProperty("schedule_date") String scheduleDate,
            @JsonProperty("day_of_week") int dayOfWeek,
            @JsonProperty("start_time") String startTime,
            @JsonProperty("end_time") String endTime,
            String subject,
            String title,
            String memo,
            @JsonProperty("is_active") boolean isActive,
            @JsonProperty("source_followup_id") String sourceFollowupId
    ) {
    }

    public record ScheduleLinkRecord(
            String id,
            @JsonProperty("source_academy_id") String sourceAcademyId,
            @JsonProperty("source_student_id") String sourceStudentId,
            @JsonProperty("target_academy_id") String targetAcademyId,
            @JsonProperty("target_student_id") String targetStudentId
    ) {
    }
}
