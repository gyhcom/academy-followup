package com.academyfollowup.api.audit;

import com.academyfollowup.api.global.supabase.SupabaseRestClient;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class AuditLogWriter {

    private static final String CONFIG_ERROR_MESSAGE = "백엔드 이력 저장 환경변수가 설정되지 않았습니다.";

    private final SupabaseRestClient supabaseRestClient;

    public AuditLogWriter(SupabaseRestClient supabaseRestClient) {
        this.supabaseRestClient = supabaseRestClient;
    }

    public void write(
            String academyId,
            String actorUserId,
            String action,
            String entityType,
            String entityId,
            String summary
    ) {
        try {
            supabaseRestClient.postServiceNoContent(
                    "/rest/v1/audit_logs",
                    Map.of(
                            "academy_id", academyId,
                            "actor_user_id", actorUserId,
                            "action", action,
                            "entity_type", entityType,
                            "entity_id", entityId,
                            "summary", summary
                    ),
                    CONFIG_ERROR_MESSAGE,
                    "return=minimal"
            );
        } catch (RuntimeException ignored) {
            // 감사 로그 저장 실패가 원래 저장 작업을 막지 않게 한다.
        }
    }
}
