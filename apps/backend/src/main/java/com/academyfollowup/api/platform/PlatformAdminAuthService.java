package com.academyfollowup.api.platform;

import com.academyfollowup.api.global.supabase.SupabaseRestClient;
import com.academyfollowup.api.global.supabase.SupabaseRestException;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PlatformAdminAuthService {

    private final SupabaseRestClient supabaseRestClient;

    public PlatformAdminAuthService(SupabaseRestClient supabaseRestClient) {
        this.supabaseRestClient = supabaseRestClient;
    }

    public PlatformAdminContext resolve(String authorizationHeader) {
        String accessToken = bearerToken(authorizationHeader);
        if (!StringUtils.hasText(accessToken)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }

        SupabaseUserResponse user = fetchUser(accessToken);
        PlatformAdminRecord admin = fetchPlatformAdmin(user.id());

        if (admin == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "슈퍼어드민 권한이 필요합니다.");
        }

        return new PlatformAdminContext(user.id(), user.email() == null ? "" : user.email(), admin.role());
    }

    private SupabaseUserResponse fetchUser(String accessToken) {
        try {
            SupabaseUserResponse response = supabaseRestClient.getWithUserToken(
                    "/auth/v1/user",
                    accessToken,
                    SupabaseUserResponse.class
            );

            if (response == null || !StringUtils.hasText(response.id())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
            }

            return response;
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
    }

    private PlatformAdminRecord fetchPlatformAdmin(String userId) {
        try {
            var records = supabaseRestClient.getServiceArray(
                    "/rest/v1/platform_admins?select=user_id,role&user_id=eq." + encode(userId) + "&limit=1",
                    PlatformAdminRecord[].class,
                    "백엔드 플랫폼 인증 환경변수가 설정되지 않았습니다."
            );
            return records.isEmpty() ? null : records.getFirst();
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "슈퍼어드민 권한 조회 중 오류가 발생했습니다.");
        }
    }

    private String bearerToken(String authorizationHeader) {
        if (!StringUtils.hasText(authorizationHeader) || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }

        return authorizationHeader.substring("Bearer ".length()).trim();
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private record SupabaseUserResponse(String id, String email) {
    }

    private record PlatformAdminRecord(
            @JsonProperty("user_id") String userId,
            String role
    ) {
    }
}
