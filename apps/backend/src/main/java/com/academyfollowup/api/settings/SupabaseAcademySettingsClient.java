package com.academyfollowup.api.settings;

import com.academyfollowup.api.global.supabase.SupabaseRestClient;
import com.academyfollowup.api.global.supabase.SupabaseRestException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class SupabaseAcademySettingsClient {

    private static final String CONFIG_ERROR = "백엔드 설정 저장 환경변수가 설정되지 않았습니다.";

    private final SupabaseRestClient supabaseRestClient;

    public SupabaseAcademySettingsClient(SupabaseRestClient supabaseRestClient) {
        this.supabaseRestClient = supabaseRestClient;
    }

    public void updateAcademy(
            String academyId,
            String academyName,
            String senderName,
            String senderPhone
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", academyName);
        body.put("sender_name", senderName);
        body.put("sender_phone", senderPhone);

        patchNoContent("/rest/v1/academies?id=eq." + encode(academyId), body);
    }

    public void upsertSettings(
            String academyId,
            boolean smsDryRun,
            int duplicateGuardMinutes,
            boolean allowAssistantSend
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("academy_id", academyId);
        body.put("sms_dry_run", smsDryRun);
        body.put("duplicate_guard_minutes", duplicateGuardMinutes);
        body.put("allow_assistant_send", allowAssistantSend);
        body.put("updated_at", OffsetDateTime.now().toString());

        try {
            supabaseRestClient.postServiceArray(
                    "/rest/v1/academy_settings?on_conflict=academy_id&select=academy_id",
                    body,
                    AcademySettingsUpsertRecord[].class,
                    CONFIG_ERROR,
                    "resolution=merge-duplicates,return=representation"
            );
        } catch (SupabaseRestException exception) {
            throw toSettingsError(exception);
        }
    }

    private void patchNoContent(String path, Object body) {
        try {
            supabaseRestClient.patchServiceArray(
                    path,
                    body,
                    AcademyUpdateRecord[].class,
                    CONFIG_ERROR,
                    "return=minimal"
            );
        } catch (SupabaseRestException exception) {
            throw toSettingsError(exception);
        }
    }

    private ResponseStatusException toSettingsError(SupabaseRestException exception) {
        return new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                CONFIG_ERROR.equals(exception.getMessage()) ? CONFIG_ERROR : "학원 설정 저장 중 오류가 발생했습니다."
        );
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private record AcademyUpdateRecord(String id) {
    }

    private record AcademySettingsUpsertRecord(String academyId) {
    }
}
