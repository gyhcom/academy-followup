package com.academyfollowup.api.health;

import com.academyfollowup.api.global.supabase.SupabaseRestClient;
import com.academyfollowup.api.global.supabase.SupabaseRestException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SupabaseHealthService {

    private static final String CONFIG_ERROR = "Supabase URL 또는 service role key가 설정되지 않았습니다.";

    private final SupabaseRestClient supabaseRestClient;

    public SupabaseHealthService(SupabaseRestClient supabaseRestClient) {
        this.supabaseRestClient = supabaseRestClient;
    }

    public Map<String, Object> check() {
        try {
            supabaseRestClient.getServiceArray(
                    "/rest/v1/academies?select=id&limit=1",
                    AcademyRecord[].class,
                    CONFIG_ERROR
            );
            return Map.of("ok", true, "status", "connected");
        } catch (SupabaseRestException exception) {
            if (CONFIG_ERROR.equals(exception.getMessage())) {
                return Map.of(
                        "ok", false,
                        "status", "not_configured",
                        "message", CONFIG_ERROR
                );
            }

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Supabase REST 조회 중 오류가 발생했습니다."
            );
        }
    }

    private record AcademyRecord(String id) {
    }
}
