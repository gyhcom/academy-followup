package com.academyfollowup.api.sharing;

import com.academyfollowup.api.global.supabase.SupabaseRestClient;
import com.academyfollowup.api.global.supabase.SupabaseRestException;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class SupabaseScheduleSharingClient {

    private static final String CONFIG_ERROR = "백엔드 공유 환경변수가 설정되지 않았습니다.";

    private final SupabaseRestClient supabaseRestClient;

    public SupabaseScheduleSharingClient(SupabaseRestClient supabaseRestClient) {
        this.supabaseRestClient = supabaseRestClient;
    }

    public Optional<StudentRecord> findStudent(String academyId, String studentId) {
        return getArray(
                "/rest/v1/students?select=id,academy_id,class_id,name,school_name,grade_label,parent_phone,student_phone,schedule_share_consent_confirmed"
                        + "&academy_id=eq." + encode(academyId)
                        + "&id=eq." + encode(studentId)
                        + "&limit=1",
                StudentRecord[].class
        ).stream().findFirst();
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

    public Optional<ShareTokenRecord> findTokenByHash(String hash) {
        return getArray(
                "/rest/v1/student_share_tokens?select=id,academy_id,student_id,status,expires_at"
                        + "&token_hash=eq." + encode(hash)
                        + "&limit=1",
                ShareTokenRecord[].class
        ).stream().findFirst();
    }

    public void insertShareToken(String academyId, String studentId, String hash, String expiresAt, String userId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("academy_id", academyId);
        body.put("student_id", studentId);
        body.put("token_hash", hash);
        body.put("status", "active");
        body.put("expires_at", expiresAt);
        body.put("created_by", userId);
        postArray("/rest/v1/student_share_tokens?select=id", body, IdRecord[].class, "return=representation");
    }

    public void expireToken(String tokenId) {
        patchArray(
                "/rest/v1/student_share_tokens?id=eq." + encode(tokenId),
                Map.of("status", "expired", "updated_at", Instant.now().toString()),
                IdRecord[].class,
                "return=minimal"
        );
    }

    public void markTokenUsed(String tokenId) {
        patchArray(
                "/rest/v1/student_share_tokens?id=eq." + encode(tokenId),
                Map.of("status", "used", "used_at", Instant.now().toString(), "updated_at", Instant.now().toString()),
                IdRecord[].class,
                "return=minimal"
        );
    }

    public List<ShareLinkRecord> findLinks(String academyId, String studentId, boolean sourceSide) {
        String academyColumn = sourceSide ? "source_academy_id" : "target_academy_id";
        String studentColumn = sourceSide ? "source_student_id" : "target_student_id";
        return getArray(
                "/rest/v1/student_schedule_links?select=id,source_academy_id,source_student_id,target_academy_id,target_student_id,status,consent_method,created_at"
                        + "&" + academyColumn + "=eq." + encode(academyId)
                        + "&" + studentColumn + "=eq." + encode(studentId)
                        + "&status=eq.active",
                ShareLinkRecord[].class
        );
    }

    public Optional<ShareLinkRecord> findActiveLink(String linkId) {
        return getArray(
                "/rest/v1/student_schedule_links?select=id,source_academy_id,source_student_id,target_academy_id,target_student_id,status,consent_method,created_at"
                        + "&id=eq." + encode(linkId)
                        + "&status=eq.active"
                        + "&limit=1",
                ShareLinkRecord[].class
        ).stream().findFirst();
    }

    public void insertLink(
            String sourceAcademyId,
            String sourceStudentId,
            String targetAcademyId,
            String targetStudentId,
            String userId
    ) {
        postArray(
                "/rest/v1/student_schedule_links?select=id",
                Map.of(
                        "source_academy_id", sourceAcademyId,
                        "source_student_id", sourceStudentId,
                        "target_academy_id", targetAcademyId,
                        "target_student_id", targetStudentId,
                        "status", "active",
                        "consent_method", "manual",
                        "created_by", userId
                ),
                IdRecord[].class,
                "return=representation"
        );
    }

    public void revokeLink(String linkId, String userId) {
        patchArray(
                "/rest/v1/student_schedule_links?id=eq." + encode(linkId),
                Map.of("status", "revoked", "revoked_at", Instant.now().toString(), "revoked_by", userId),
                IdRecord[].class,
                "return=minimal"
        );
    }

    public List<StudentConsentRecord> findStudentConsents(List<String> studentIds) {
        if (studentIds.isEmpty()) {
            return List.of();
        }
        return getArray(
                "/rest/v1/students?select=id,academy_id,schedule_share_consent_confirmed"
                        + "&id=in.(" + joinEncoded(studentIds) + ")",
                StudentConsentRecord[].class
        );
    }

    public List<SharedScheduleRecord> findSchedules(List<String> studentIds) {
        if (studentIds.isEmpty()) {
            return List.of();
        }
        return getArray(
                "/rest/v1/student_schedules?select=id,academy_id,student_id,schedule_type,schedule_date,day_of_week,start_time,end_time,subject,title,is_active"
                        + "&student_id=in.(" + joinEncoded(studentIds) + ")"
                        + "&is_active=eq.true"
                        + "&order=day_of_week.asc,start_time.asc",
                SharedScheduleRecord[].class
        );
    }

    private <T> List<T> getArray(String path, Class<T[]> type) {
        try {
            return supabaseRestClient.getServiceArray(path, type, CONFIG_ERROR);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "공유 스케줄 조회 중 오류가 발생했습니다.");
        }
    }

    private <T> List<T> postArray(String path, Object body, Class<T[]> type, String preferHeader) {
        try {
            return supabaseRestClient.postServiceArray(path, body, type, CONFIG_ERROR, preferHeader);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "공유 스케줄 저장 중 오류가 발생했습니다.");
        }
    }

    private <T> List<T> patchArray(String path, Object body, Class<T[]> type, String preferHeader) {
        try {
            return supabaseRestClient.patchServiceArray(path, body, type, CONFIG_ERROR, preferHeader);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "공유 스케줄 수정 중 오류가 발생했습니다.");
        }
    }

    private String joinEncoded(List<String> values) {
        return String.join(",", values.stream().map(this::encode).toList());
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public record IdRecord(String id) {
    }

    public record ClassRecord(String id, @JsonProperty("teacher_id") String teacherId) {
    }

    public record StudentRecord(
            String id,
            @JsonProperty("academy_id") String academyId,
            @JsonProperty("class_id") String classId,
            String name,
            @JsonProperty("school_name") String schoolName,
            @JsonProperty("grade_label") String gradeLabel,
            @JsonProperty("parent_phone") String parentPhone,
            @JsonProperty("student_phone") String studentPhone,
            @JsonProperty("schedule_share_consent_confirmed") boolean scheduleShareConsentConfirmed
    ) {
    }

    public record ShareTokenRecord(
            String id,
            @JsonProperty("academy_id") String academyId,
            @JsonProperty("student_id") String studentId,
            String status,
            @JsonProperty("expires_at") String expiresAt
    ) {
    }

    public record ShareLinkRecord(
            String id,
            @JsonProperty("source_academy_id") String sourceAcademyId,
            @JsonProperty("source_student_id") String sourceStudentId,
            @JsonProperty("target_academy_id") String targetAcademyId,
            @JsonProperty("target_student_id") String targetStudentId,
            String status,
            @JsonProperty("consent_method") String consentMethod,
            @JsonProperty("created_at") String createdAt
    ) {
    }

    public record StudentConsentRecord(
            String id,
            @JsonProperty("academy_id") String academyId,
            @JsonProperty("schedule_share_consent_confirmed") boolean scheduleShareConsentConfirmed
    ) {
    }

    public record SharedScheduleRecord(
            String id,
            @JsonProperty("academy_id") String academyId,
            @JsonProperty("student_id") String studentId,
            @JsonProperty("schedule_type") String scheduleType,
            @JsonProperty("schedule_date") String scheduleDate,
            @JsonProperty("day_of_week") int dayOfWeek,
            @JsonProperty("start_time") String startTime,
            @JsonProperty("end_time") String endTime,
            String subject,
            String title,
            @JsonProperty("is_active") boolean isActive
    ) {
    }
}
