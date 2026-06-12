package com.academyfollowup.api.message;

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
}
