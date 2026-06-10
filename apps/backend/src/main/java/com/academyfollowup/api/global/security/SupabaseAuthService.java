package com.academyfollowup.api.global.security;

import com.academyfollowup.api.global.config.SupabaseProperties;
import java.net.URI;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

@Service
public class SupabaseAuthService {

    private final SupabaseProperties supabaseProperties;
    private final RestClient restClient;

    public SupabaseAuthService(SupabaseProperties supabaseProperties, RestClient.Builder restClientBuilder) {
        this.supabaseProperties = supabaseProperties;
        this.restClient = restClientBuilder.build();
    }

    public WorkspaceContext resolveWorkspace(String accessToken) {
        assertConfigured();

        String userId = fetchUserId(accessToken);
        ProfileRecord profile = fetchProfile(userId);

        if (profile == null) {
            throw new SupabaseAuthException(HttpStatus.FORBIDDEN, "학원 워크스페이스 연결이 필요합니다.");
        }

        if (!"active".equals(profile.status())) {
            throw new SupabaseAuthException(HttpStatus.FORBIDDEN, "비활성 계정은 접근할 수 없습니다.");
        }

        return new WorkspaceContext(
                userId,
                profile.academyId(),
                profile.role(),
                profile.status()
        );
    }

    private void assertConfigured() {
        if (!StringUtils.hasText(supabaseProperties.url())
                || !StringUtils.hasText(supabaseProperties.serviceRoleKey())) {
            throw new SupabaseAuthException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "백엔드 인증 환경변수가 설정되지 않았습니다."
            );
        }
    }

    private String fetchUserId(String accessToken) {
        try {
            SupabaseUserResponse response = restClient.get()
                    .uri(supabaseUri("/auth/v1/user"))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .header("apikey", supabaseProperties.serviceRoleKey())
                    .retrieve()
                    .body(SupabaseUserResponse.class);

            if (response == null || !StringUtils.hasText(response.id())) {
                throw new SupabaseAuthException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
            }

            return response.id();
        } catch (HttpClientErrorException.Unauthorized exception) {
            throw new SupabaseAuthException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        } catch (HttpClientErrorException exception) {
            throw new SupabaseAuthException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
    }

    private ProfileRecord fetchProfile(String userId) {
        try {
            ProfileRecord[] profiles = restClient.get()
                    .uri(supabaseUri("/rest/v1/profiles?id=eq." + userId
                            + "&select=id,academy_id,role,status&limit=1"))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + supabaseProperties.serviceRoleKey())
                    .header("apikey", supabaseProperties.serviceRoleKey())
                    .header("Accept", "application/json")
                    .retrieve()
                    .body(ProfileRecord[].class);

            if (profiles == null || profiles.length == 0) {
                return null;
            }

            return profiles[0];
        } catch (HttpClientErrorException exception) {
            throw new SupabaseAuthException(HttpStatus.INTERNAL_SERVER_ERROR, "프로필 조회 중 오류가 발생했습니다.");
        }
    }

    private URI supabaseUri(String path) {
        String baseUrl = supabaseProperties.url().replaceAll("/+$", "");
        return URI.create(baseUrl + path);
    }

    private record SupabaseUserResponse(String id) {
    }

    private record ProfileRecord(
            String id,
            @com.fasterxml.jackson.annotation.JsonProperty("academy_id") String academyId,
            String role,
            String status
    ) {
    }
}
