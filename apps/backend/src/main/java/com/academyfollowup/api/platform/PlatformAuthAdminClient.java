package com.academyfollowup.api.platform;

import com.academyfollowup.api.global.config.SupabaseProperties;
import com.academyfollowup.api.member.AuthUserRecord;
import java.net.URI;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Component
public class PlatformAuthAdminClient {

    private static final String CONFIG_ERROR = "백엔드 플랫폼 Auth 환경변수가 설정되지 않았습니다.";

    private final SupabaseProperties supabaseProperties;
    private final RestClient restClient;

    public PlatformAuthAdminClient(SupabaseProperties supabaseProperties, RestClient.Builder restClientBuilder) {
        this.supabaseProperties = supabaseProperties;
        this.restClient = restClientBuilder.build();
    }

    public List<AuthUserRecord> listUsers() {
        assertConfigured();

        try {
            UsersResponse response = restClient.get()
                    .uri(supabaseUri("/auth/v1/admin/users"))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + supabaseProperties.serviceRoleKey())
                    .header("apikey", supabaseProperties.serviceRoleKey())
                    .retrieve()
                    .body(UsersResponse.class);
            return response == null || response.users() == null ? List.of() : response.users();
        } catch (HttpClientErrorException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "원장 이메일 중복 여부를 확인하지 못했습니다.");
        }
    }

    public AuthUserRecord createOwner(String email, String password, String ownerName) {
        assertConfigured();

        try {
            AuthUserRecord response = restClient.post()
                    .uri(supabaseUri("/auth/v1/admin/users"))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + supabaseProperties.serviceRoleKey())
                    .header("apikey", supabaseProperties.serviceRoleKey())
                    .header("Content-Type", "application/json")
                    .body(Map.of(
                            "email", email,
                            "password", password,
                            "email_confirm", true,
                            "user_metadata", Map.of(
                                    "name", ownerName,
                                    "role", "owner"
                            )
                    ))
                    .retrieve()
                    .body(AuthUserRecord.class);

            if (response == null || !StringUtils.hasText(response.id())) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "원장 계정을 생성하지 못했습니다.");
            }

            return response;
        } catch (HttpClientErrorException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, readErrorMessage(exception, "원장 계정을 생성하지 못했습니다."));
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
            // rollback 중 Auth 삭제 실패가 원래 오류를 덮지 않게 한다.
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

    private record UsersResponse(List<AuthUserRecord> users) {
    }

}
