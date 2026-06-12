package com.academyfollowup.api.external;

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
public class SupabaseExternalClassClient {

    private static final String CONFIG_ERROR = "백엔드 관리 환경변수가 설정되지 않았습니다.";

    private final SupabaseRestClient supabaseRestClient;

    public SupabaseExternalClassClient(SupabaseRestClient supabaseRestClient) {
        this.supabaseRestClient = supabaseRestClient;
    }

    public boolean studentExists(String academyId, String studentId) {
        return getArray(
                "/rest/v1/students?select=id"
                        + "&academy_id=eq." + encode(academyId)
                        + "&id=eq." + encode(studentId)
                        + "&limit=1",
                IdRecord[].class
        ).stream().findFirst().isPresent();
    }

    public List<ExternalAcademyRecord> findActiveExternalAcademies(String academyId) {
        return getArray(
                "/rest/v1/external_academies?select=id,name,is_active"
                        + "&academy_id=eq." + encode(academyId)
                        + "&is_active=eq.true",
                ExternalAcademyRecord[].class
        );
    }

    public ExternalAcademyRecord insertExternalAcademy(String academyId, String name, String userId) {
        return postArray(
                "/rest/v1/external_academies?select=id,name,is_active",
                Map.of("academy_id", academyId, "name", name, "created_by", userId),
                ExternalAcademyRecord[].class,
                "return=representation"
        ).stream().findFirst().orElseThrow(() -> saveError("타 학원 정보를 저장하지 못했습니다."));
    }

    public Optional<ExternalClassRecord> findExternalClass(
            String academyId,
            String externalAcademyId,
            int dayOfWeek,
            String startTime,
            String endTime
    ) {
        return getArray(
                "/rest/v1/external_academy_classes?select=id"
                        + "&academy_id=eq." + encode(academyId)
                        + "&external_academy_id=eq." + encode(externalAcademyId)
                        + "&day_of_week=eq." + dayOfWeek
                        + "&start_time=eq." + encode(startTime)
                        + "&end_time=eq." + encode(endTime)
                        + "&is_active=eq.true"
                        + "&limit=1",
                ExternalClassRecord[].class
        ).stream().findFirst();
    }

    public ExternalClassRecord insertExternalClass(
            String academyId,
            String externalAcademyId,
            String title,
            String subject,
            String scheduleDate,
            int dayOfWeek,
            String startTime,
            String endTime,
            String memo,
            String userId
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("academy_id", academyId);
        body.put("external_academy_id", externalAcademyId);
        body.put("title", title);
        body.put("subject", subject);
        body.put("schedule_date", scheduleDate);
        body.put("day_of_week", dayOfWeek);
        body.put("start_time", startTime);
        body.put("end_time", endTime);
        body.put("memo", memo);
        body.put("created_by", userId);
        return postArray(
                "/rest/v1/external_academy_classes?select=id",
                body,
                ExternalClassRecord[].class,
                "return=representation"
        ).stream().findFirst().orElseThrow(() -> saveError("타 학원 수업을 저장하지 못했습니다."));
    }

    public Optional<EnrollmentRecord> findEnrollment(String academyId, String studentId, String externalClassId) {
        return getArray(
                "/rest/v1/student_external_class_enrollments?select=id,is_active"
                        + "&academy_id=eq." + encode(academyId)
                        + "&student_id=eq." + encode(studentId)
                        + "&external_academy_class_id=eq." + encode(externalClassId)
                        + "&limit=1",
                EnrollmentRecord[].class
        ).stream().findFirst();
    }

    public EnrollmentRecord insertEnrollment(String academyId, String studentId, String externalClassId, String userId) {
        return postArray(
                "/rest/v1/student_external_class_enrollments?select=id,is_active",
                Map.of(
                        "academy_id", academyId,
                        "student_id", studentId,
                        "external_academy_class_id", externalClassId,
                        "created_by", userId
                ),
                EnrollmentRecord[].class,
                "return=representation"
        ).stream().findFirst().orElseThrow(() -> saveError("타 학원 수업 연결을 저장하지 못했습니다."));
    }

    public EnrollmentRecord activateEnrollment(String enrollmentId) {
        return patchArray(
                "/rest/v1/student_external_class_enrollments?select=id,is_active"
                        + "&id=eq." + encode(enrollmentId),
                Map.of("is_active", true, "updated_at", Instant.now().toString()),
                EnrollmentRecord[].class,
                "return=representation"
        ).stream().findFirst().orElseThrow(() -> saveError("타 학원 수업 연결을 저장하지 못했습니다."));
    }

    public Optional<IdRecord> deactivateEnrollment(String academyId, String enrollmentId) {
        return patchArray(
                "/rest/v1/student_external_class_enrollments?select=id"
                        + "&academy_id=eq." + encode(academyId)
                        + "&id=eq." + encode(enrollmentId),
                Map.of("is_active", false, "updated_at", Instant.now().toString()),
                IdRecord[].class,
                "return=representation"
        ).stream().findFirst();
    }

    private <T> List<T> getArray(String path, Class<T[]> type) {
        try {
            return supabaseRestClient.getServiceArray(path, type, CONFIG_ERROR);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "타 학원 수업 조회 중 오류가 발생했습니다.");
        }
    }

    private <T> List<T> postArray(String path, Object body, Class<T[]> type, String preferHeader) {
        try {
            return supabaseRestClient.postServiceArray(path, body, type, CONFIG_ERROR, preferHeader);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "타 학원 수업 저장 중 오류가 발생했습니다.");
        }
    }

    private <T> List<T> patchArray(String path, Object body, Class<T[]> type, String preferHeader) {
        try {
            return supabaseRestClient.patchServiceArray(path, body, type, CONFIG_ERROR, preferHeader);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "타 학원 수업 수정 중 오류가 발생했습니다.");
        }
    }

    private ResponseStatusException saveError(String message) {
        return new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, message);
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public record IdRecord(String id) {
    }

    public record ExternalAcademyRecord(String id, String name, @JsonProperty("is_active") boolean isActive) {
    }

    public record ExternalClassRecord(String id) {
    }

    public record EnrollmentRecord(String id, @JsonProperty("is_active") boolean isActive) {
    }
}
