package com.academyfollowup.api.member;

import com.academyfollowup.api.global.config.SupabaseProperties;
import java.net.URI;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Component
public class SupabaseAuthAdminClient {

    private static final String CONFIG_ERROR = "백엔드 구성원 Auth 환경변수가 설정되지 않았습니다.";

    private final SupabaseProperties supabaseProperties;
    private final RestClient restClient;

    public SupabaseAuthAdminClient(SupabaseProperties supabaseProperties, RestClient.Builder restClientBuilder) {
        this.supabaseProperties = supabaseProperties;
        this.restClient = restClientBuilder.build();
    }

    public AuthUserRecord createUser(String academyId, MemberPayload payload) {
        assertConfigured();

        try {
            AuthUserRecord response = restClient.post()
                    .uri(supabaseUri("/auth/v1/admin/users"))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + supabaseProperties.serviceRoleKey())
                    .header("apikey", supabaseProperties.serviceRoleKey())
                    .header("Content-Type", "application/json")
                    .body(Map.of(
                            "email", payload.email(),
                            "password", payload.password(),
                            "email_confirm", true,
                            "user_metadata", Map.of(
                                    "name", payload.name(),
                                    "role", payload.role(),
                                    "academy_id", academyId
                            )
                    ))
                    .retrieve()
                    .body(AuthUserRecord.class);

            if (response == null || !StringUtils.hasText(response.id())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "구성원 계정을 생성하지 못했습니다.");
            }

            return response;
        } catch (HttpClientErrorException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, readErrorMessage(exception, "구성원 계정을 생성하지 못했습니다."));
        }
    }

    public void updateUser(String academyId, MemberPayload payload) {
        assertConfigured();

        try {
            restClient.put()
                    .uri(supabaseUri("/auth/v1/admin/users/" + payload.memberId()))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + supabaseProperties.serviceRoleKey())
                    .header("apikey", supabaseProperties.serviceRoleKey())
                    .header("Content-Type", "application/json")
                    .body(Map.of(
                            "email", payload.email(),
                            "user_metadata", Map.of(
                                    "name", payload.name(),
                                    "role", payload.role(),
                                    "academy_id", academyId
                            )
                    ))
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, readErrorMessage(exception, "구성원 계정을 수정하지 못했습니다."));
        }
    }

    public void deleteUser(String userId) {
        assertConfigured();

        try {
            restClient.delete()
                    .uri(supabaseUri("/auth/v1/admin/users/" + userId))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + supabaseProperties.serviceRoleKey())
                    .header("apikey", supabaseProperties.serviceRoleKey())
                    .retrieve()
                    .toBodilessEntity();
        } catch (RuntimeException ignored) {
            // profile 저장 실패 rollback에서 Auth 삭제 실패가 원래 오류를 덮지 않게 한다.
        }
    }

    private void assertConfigured() {
        if (!StringUtils.hasText(supabaseProperties.url())
                || !StringUtils.hasText(supabaseProperties.serviceRoleKey())) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, CONFIG_ERROR);
        }
    }

    private URI supabaseUri(String path) {
        String baseUrl = supabaseProperties.url().replaceAll("/+$", "");
        return URI.create(baseUrl + path);
    }

    private String readErrorMessage(HttpClientErrorException exception, String fallback) {
        String responseBody = exception.getResponseBodyAsString();
        if (StringUtils.hasText(responseBody) && responseBody.length() < 300) {
            return responseBody;
        }
        return fallback;
    }
}
