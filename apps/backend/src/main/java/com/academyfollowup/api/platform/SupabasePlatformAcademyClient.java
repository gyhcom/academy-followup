package com.academyfollowup.api.platform;

import com.academyfollowup.api.global.supabase.SupabaseRestClient;
import com.academyfollowup.api.global.supabase.SupabaseRestException;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class SupabasePlatformAcademyClient {

    private static final String CONFIG_ERROR = "백엔드 플랫폼 학원 관리 환경변수가 설정되지 않았습니다.";
    private static final String ACADEMY_SELECT = "id,name,slug,plan,status,category,owner_user_id,created_at";

    private final SupabaseRestClient supabaseRestClient;

    public SupabasePlatformAcademyClient(SupabaseRestClient supabaseRestClient) {
        this.supabaseRestClient = supabaseRestClient;
    }

    public List<AcademyRecord> findAcademies() {
        return getArray(
                "/rest/v1/academies?select=" + ACADEMY_SELECT + "&order=created_at.desc",
                AcademyRecord[].class,
                "학원 목록 조회 중 오류가 발생했습니다."
        );
    }

    public Optional<IdRecord> findAcademyBySlug(String slug) {
        return getArray(
                "/rest/v1/academies?select=id&slug=eq." + encode(slug) + "&limit=1",
                IdRecord[].class,
                "학원 slug 중복 여부를 확인하지 못했습니다."
        ).stream().findFirst();
    }

    public Optional<AcademyRecord> insertAcademy(
            String name,
            String slug,
            String category,
            String plan,
            String status,
            String ownerUserId
    ) {
        Map<String, Object> body = new HashMap<>();
        body.put("name", name);
        body.put("slug", slug);
        body.put("category", category);
        body.put("plan", plan);
        body.put("status", status);
        body.put("owner_user_id", ownerUserId);

        return postArray(
                "/rest/v1/academies?select=" + ACADEMY_SELECT,
                body,
                AcademyRecord[].class,
                "return=representation",
                "학원을 생성하지 못했습니다."
        ).stream().findFirst();
    }

    public void insertSettings(String academyId) {
        postNoContent(
                "/rest/v1/academy_settings",
                Map.of(
                        "academy_id", academyId,
                        "sms_dry_run", true
                ),
                "return=minimal",
                "학원 기본 설정을 만들지 못했습니다."
        );
    }

    public void insertOwnerProfile(String academyId, String ownerUserId, String ownerEmail, String ownerName) {
        postNoContent(
                "/rest/v1/profiles",
                Map.of(
                        "id", ownerUserId,
                        "academy_id", academyId,
                        "email", ownerEmail,
                        "name", ownerName,
                        "role", "owner",
                        "status", "active"
                ),
                "return=minimal",
                "원장 프로필을 만들지 못했습니다."
        );
    }

    public Optional<AcademyRecord> updateAcademy(String academyId, String status, String plan) {
        Map<String, Object> body = new HashMap<>();
        if (status != null) {
            body.put("status", status);
        }
        if (plan != null) {
            body.put("plan", plan);
        }

        return patchArray(
                "/rest/v1/academies?select=" + ACADEMY_SELECT
                        + "&id=eq." + encode(academyId),
                body,
                AcademyRecord[].class,
                "return=representation",
                "학원 상태를 수정하지 못했습니다."
        ).stream().findFirst();
    }

    public void deleteAcademy(String academyId) {
        try {
            supabaseRestClient.deleteServiceNoContent(
                    "/rest/v1/academies?id=eq." + encode(academyId),
                    CONFIG_ERROR,
                    null
            );
        } catch (RuntimeException ignored) {
            // rollback best effort. 삭제 실패가 원래 오류를 덮지 않게 한다.
        }
    }

    private <T> List<T> getArray(String path, Class<T[]> type, String errorMessage) {
        try {
            return supabaseRestClient.getServiceArray(path, type, CONFIG_ERROR);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    CONFIG_ERROR.equals(exception.getMessage()) ? CONFIG_ERROR : errorMessage
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

    public record AcademyRecord(
            String id,
            String name,
            String slug,
            String plan,
            String status,
            String category,
            @JsonProperty("owner_user_id") String ownerUserId,
            @JsonProperty("created_at") String createdAt
    ) {
    }

    public record IdRecord(String id) {
    }
}
