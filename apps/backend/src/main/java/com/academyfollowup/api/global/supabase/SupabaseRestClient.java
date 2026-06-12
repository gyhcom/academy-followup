package com.academyfollowup.api.global.supabase;

import com.academyfollowup.api.global.config.SupabaseProperties;
import java.net.URI;
import java.util.Arrays;
import java.util.List;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

@Component
public class SupabaseRestClient {

    private final SupabaseProperties supabaseProperties;
    private final RestClient restClient;

    public SupabaseRestClient(SupabaseProperties supabaseProperties, RestClient.Builder restClientBuilder) {
        this.supabaseProperties = supabaseProperties;
        this.restClient = restClientBuilder.build();
    }

    public <T> T getWithUserToken(String path, String accessToken, Class<T> responseType) {
        assertConfigured("백엔드 인증 환경변수가 설정되지 않았습니다.");

        try {
            return restClient.get()
                    .uri(supabaseUri(path))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .header("apikey", supabaseProperties.serviceRoleKey())
                    .retrieve()
                    .body(responseType);
        } catch (HttpClientErrorException exception) {
            throw new SupabaseRestException("로그인이 필요합니다.");
        }
    }

    public <T> List<T> getServiceArray(String path, Class<T[]> responseType, String configErrorMessage) {
        assertConfigured(configErrorMessage);

        try {
            T[] response = restClient.get()
                    .uri(supabaseUri(path))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + supabaseProperties.serviceRoleKey())
                    .header("apikey", supabaseProperties.serviceRoleKey())
                    .header("Accept", "application/json")
                    .retrieve()
                    .body(responseType);

            if (response == null) {
                return List.of();
            }

            return Arrays.asList(response);
        } catch (HttpClientErrorException exception) {
            throw new SupabaseRestException("Supabase REST 조회 중 오류가 발생했습니다.");
        }
    }

    public <T> List<T> postServiceArray(
            String path,
            Object body,
            Class<T[]> responseType,
            String configErrorMessage,
            String preferHeader
    ) {
        return writeServiceArray(HttpMethod.POST, path, body, responseType, configErrorMessage, preferHeader);
    }

    public <T> List<T> patchServiceArray(
            String path,
            Object body,
            Class<T[]> responseType,
            String configErrorMessage,
            String preferHeader
    ) {
        return writeServiceArray(HttpMethod.PATCH, path, body, responseType, configErrorMessage, preferHeader);
    }

    public void postServiceNoContent(
            String path,
            Object body,
            String configErrorMessage,
            String preferHeader
    ) {
        assertConfigured(configErrorMessage);

        try {
            var request = restClient.post()
                    .uri(supabaseUri(path))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + supabaseProperties.serviceRoleKey())
                    .header("apikey", supabaseProperties.serviceRoleKey())
                    .header("Content-Type", "application/json");

            if (StringUtils.hasText(preferHeader)) {
                request.header("Prefer", preferHeader);
            }

            request.body(body).retrieve().toBodilessEntity();
        } catch (HttpClientErrorException exception) {
            throw new SupabaseRestException("Supabase REST 저장 중 오류가 발생했습니다.");
        }
    }

    private <T> List<T> writeServiceArray(
            HttpMethod method,
            String path,
            Object body,
            Class<T[]> responseType,
            String configErrorMessage,
            String preferHeader
    ) {
        assertConfigured(configErrorMessage);

        try {
            var request = restClient.method(method)
                    .uri(supabaseUri(path))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + supabaseProperties.serviceRoleKey())
                    .header("apikey", supabaseProperties.serviceRoleKey())
                    .header("Accept", "application/json")
                    .header("Content-Type", "application/json");

            if (StringUtils.hasText(preferHeader)) {
                request.header("Prefer", preferHeader);
            }

            T[] response = request.body(body).retrieve().body(responseType);

            if (response == null) {
                return List.of();
            }

            return Arrays.asList(response);
        } catch (HttpClientErrorException exception) {
            throw new SupabaseRestException("Supabase REST 저장 중 오류가 발생했습니다.");
        }
    }

    private void assertConfigured(String message) {
        if (!StringUtils.hasText(supabaseProperties.url())
                || !StringUtils.hasText(supabaseProperties.serviceRoleKey())) {
            throw new SupabaseRestException(message);
        }
    }

    private URI supabaseUri(String path) {
        String baseUrl = supabaseProperties.url().replaceAll("/+$", "");
        return URI.create(baseUrl + path);
    }
}
