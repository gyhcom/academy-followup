package com.academyfollowup.api.global.security;

import com.academyfollowup.api.global.supabase.SupabaseRestClient;
import com.academyfollowup.api.global.supabase.SupabaseRestException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class SupabaseAuthService {

    private final SupabaseRestClient supabaseRestClient;

    public SupabaseAuthService(SupabaseRestClient supabaseRestClient) {
        this.supabaseRestClient = supabaseRestClient;
    }

    public WorkspaceContext resolveWorkspace(String accessToken) {
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

    private String fetchUserId(String accessToken) {
        try {
            SupabaseUserResponse response = supabaseRestClient.getWithUserToken(
                    "/auth/v1/user",
                    accessToken,
                    SupabaseUserResponse.class
            );

            if (response == null || !StringUtils.hasText(response.id())) {
                throw new SupabaseAuthException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
            }

            return response.id();
        } catch (SupabaseRestException exception) {
            throw new SupabaseAuthException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
    }

    private ProfileRecord fetchProfile(String userId) {
        try {
            var profiles = supabaseRestClient.getServiceArray(
                    "/rest/v1/profiles?id=eq." + userId + "&select=id,academy_id,role,status&limit=1",
                    ProfileRecord[].class,
                    "백엔드 인증 환경변수가 설정되지 않았습니다."
            );

            if (profiles.isEmpty()) {
                return null;
            }

            return profiles.getFirst();
        } catch (SupabaseRestException exception) {
            throw new SupabaseAuthException(HttpStatus.INTERNAL_SERVER_ERROR, "프로필 조회 중 오류가 발생했습니다.");
        }
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
