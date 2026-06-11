package com.academyfollowup.api.message;

import com.academyfollowup.api.global.supabase.SupabaseRestClient;
import com.academyfollowup.api.global.supabase.SupabaseRestException;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class SupabaseMessageClient {

    private static final String CONFIG_ERROR = "백엔드 문자 미리보기 환경변수가 설정되지 않았습니다.";

    private final SupabaseRestClient supabaseRestClient;

    public SupabaseMessageClient(SupabaseRestClient supabaseRestClient) {
        this.supabaseRestClient = supabaseRestClient;
    }

    public List<TemplateRecord> findTemplates(String academyId) {
        return getArray(
                "/rest/v1/message_templates?select=id,reason,title,body,is_active,created_at"
                        + "&academy_id=eq." + encode(academyId)
                        + "&order=created_at.asc",
                TemplateRecord[].class
        );
    }

    public Optional<TemplateRecord> findActiveTemplate(String academyId, String reason) {
        return getArray(
                "/rest/v1/message_templates?select=id,reason,title,body,is_active,created_at"
                        + "&academy_id=eq." + encode(academyId)
                        + "&reason=eq." + encode(reason)
                        + "&is_active=eq.true"
                        + "&limit=1",
                TemplateRecord[].class
        ).stream().findFirst();
    }

    public Optional<TemplateRecord> upsertTemplate(
            String academyId,
            String reason,
            String title,
            String body,
            boolean active
    ) {
        return upsertArray(
                "/rest/v1/message_templates?on_conflict=academy_id,reason&select=id,reason,title,body,is_active,created_at",
                Map.of(
                        "academy_id", academyId,
                        "reason", reason,
                        "title", title,
                        "body", body,
                        "is_active", active
                ),
                TemplateRecord[].class
        ).stream().findFirst();
    }

    public Optional<ProfileRecord> findProfile(String userId) {
        return getArray(
                "/rest/v1/profiles?select=id,name&id=eq." + encode(userId) + "&limit=1",
                ProfileRecord[].class
        ).stream().findFirst();
    }

    public Optional<AcademyRecord> findAcademy(String academyId) {
        return getArray(
                "/rest/v1/academies?select=id,name,sender_name&id=eq." + encode(academyId) + "&limit=1",
                AcademyRecord[].class
        ).stream().findFirst();
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

    private <T> List<T> getArray(String path, Class<T[]> type) {
        try {
            return supabaseRestClient.getServiceArray(path, type, CONFIG_ERROR);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    CONFIG_ERROR.equals(exception.getMessage()) ? CONFIG_ERROR : "문자 미리보기 조회 중 오류가 발생했습니다."
            );
        }
    }

    private <T> List<T> upsertArray(String path, Object body, Class<T[]> type) {
        try {
            return supabaseRestClient.postServiceArray(
                    path,
                    body,
                    type,
                    CONFIG_ERROR,
                    "resolution=merge-duplicates,return=representation"
            );
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    CONFIG_ERROR.equals(exception.getMessage()) ? CONFIG_ERROR : "문자 템플릿 저장 중 오류가 발생했습니다."
            );
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public record TemplateRecord(
            String id,
            String reason,
            String title,
            String body,
            @JsonProperty("is_active") boolean active,
            @JsonProperty("created_at") String createdAt
    ) {
    }

    public record ProfileRecord(String id, String name) {
    }

    public record AcademyRecord(String id, String name, @JsonProperty("sender_name") String senderName) {
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
}
