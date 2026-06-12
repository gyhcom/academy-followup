package com.academyfollowup.api.member;

import com.academyfollowup.api.global.supabase.SupabaseRestClient;
import com.academyfollowup.api.global.supabase.SupabaseRestException;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class SupabaseMemberClient {

    private static final String CONFIG_ERROR = "백엔드 구성원 환경변수가 설정되지 않았습니다.";
    private static final String MEMBER_SELECT = "id,email,name,phone,role,status";

    private final SupabaseRestClient supabaseRestClient;

    public SupabaseMemberClient(SupabaseRestClient supabaseRestClient) {
        this.supabaseRestClient = supabaseRestClient;
    }

    public List<MemberRecord> findMembers(String academyId) {
        return getArray(
                "/rest/v1/profiles?select=" + MEMBER_SELECT
                        + "&academy_id=eq." + encode(academyId)
                        + "&order=name.asc",
                MemberRecord[].class
        );
    }

    public Optional<MemberRecord> findMember(String academyId, String memberId) {
        return getArray(
                "/rest/v1/profiles?select=" + MEMBER_SELECT
                        + "&academy_id=eq." + encode(academyId)
                        + "&id=eq." + encode(memberId)
                        + "&limit=1",
                MemberRecord[].class
        ).stream().findFirst();
    }

    public MemberRecord insertProfile(String academyId, AuthUserRecord authUser, MemberPayload payload) {
        Map<String, Object> body = profileBody(academyId, payload);
        body.put("id", authUser.id());

        return postArray(
                "/rest/v1/profiles?select=" + MEMBER_SELECT,
                body,
                MemberRecord[].class,
                "return=representation"
        ).stream().findFirst().orElseThrow(() -> new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "구성원 정보를 저장하지 못했습니다."
        ));
    }

    public Optional<MemberRecord> updateProfile(String academyId, MemberPayload payload) {
        return patchArray(
                "/rest/v1/profiles?select=" + MEMBER_SELECT
                        + "&academy_id=eq." + encode(academyId)
                        + "&id=eq." + encode(payload.memberId()),
                profileBody(academyId, payload),
                MemberRecord[].class,
                "return=representation"
        ).stream().findFirst();
    }

    private Map<String, Object> profileBody(String academyId, MemberPayload payload) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("academy_id", academyId);
        body.put("email", payload.email());
        body.put("name", payload.name());
        body.put("phone", payload.phone());
        body.put("role", payload.role());
        body.put("status", payload.status());
        return body;
    }

    private <T> List<T> getArray(String path, Class<T[]> type) {
        try {
            return supabaseRestClient.getServiceArray(path, type, CONFIG_ERROR);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, errorMessage(exception, "구성원 조회 중 오류가 발생했습니다."));
        }
    }

    private <T> List<T> postArray(String path, Object body, Class<T[]> type, String preferHeader) {
        try {
            return supabaseRestClient.postServiceArray(path, body, type, CONFIG_ERROR, preferHeader);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, errorMessage(exception, "구성원 저장 중 오류가 발생했습니다."));
        }
    }

    private <T> List<T> patchArray(String path, Object body, Class<T[]> type, String preferHeader) {
        try {
            return supabaseRestClient.patchServiceArray(path, body, type, CONFIG_ERROR, preferHeader);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, errorMessage(exception, "구성원 수정 중 오류가 발생했습니다."));
        }
    }

    private String errorMessage(SupabaseRestException exception, String fallback) {
        return CONFIG_ERROR.equals(exception.getMessage()) ? CONFIG_ERROR : fallback;
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public record MemberRecord(
            String id,
            String email,
            String name,
            String phone,
            String role,
            String status,
            @JsonProperty("academy_id") String academyId
    ) {
    }
}
