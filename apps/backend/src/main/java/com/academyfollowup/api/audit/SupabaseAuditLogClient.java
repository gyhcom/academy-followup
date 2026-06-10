package com.academyfollowup.api.audit;

import com.academyfollowup.api.global.supabase.SupabaseRestClient;
import com.academyfollowup.api.global.supabase.SupabaseRestException;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class SupabaseAuditLogClient {

    private static final String CONFIG_ERROR_MESSAGE = "백엔드 이력 조회 환경변수가 설정되지 않았습니다.";

    private final SupabaseRestClient supabaseRestClient;

    public SupabaseAuditLogClient(SupabaseRestClient supabaseRestClient) {
        this.supabaseRestClient = supabaseRestClient;
    }

    public List<AuditLogsResponse.AuditLogItem> findRecentLogs(String academyId, int limit) {
        var logs = getArray(
                "/rest/v1/audit_logs?select=id,actor_user_id,action,entity_type,entity_id,summary,created_at"
                        + "&academy_id=eq." + encode(academyId)
                        + "&order=created_at.desc"
                        + "&limit=" + limit,
                AuditLogRecord[].class
        );
        var actorNames = findActorNames(logs);

        return logs.stream()
                .map(log -> new AuditLogsResponse.AuditLogItem(
                        log.id(),
                        actorNames.getOrDefault(log.actorUserId(), "시스템"),
                        log.action(),
                        log.entityType(),
                        log.entityId(),
                        log.summary(),
                        log.createdAt()
                ))
                .toList();
    }

    private Map<String, String> findActorNames(List<AuditLogRecord> logs) {
        var actorIds = logs.stream()
                .map(AuditLogRecord::actorUserId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (actorIds.isEmpty()) {
            return Map.of();
        }

        var idFilter = actorIds.stream()
                .map(this::encode)
                .collect(Collectors.joining(","));
        var profiles = getArray(
                "/rest/v1/profiles?select=id,name&id=in.(" + idFilter + ")",
                ProfileRecord[].class
        );

        return profiles.stream()
                .collect(Collectors.toMap(ProfileRecord::id, ProfileRecord::name, (left, right) -> left));
    }

    private <T> List<T> getArray(String path, Class<T[]> responseType) {
        try {
            return supabaseRestClient.getServiceArray(path, responseType, CONFIG_ERROR_MESSAGE);
        } catch (SupabaseRestException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    exception.getMessage().equals(CONFIG_ERROR_MESSAGE)
                            ? CONFIG_ERROR_MESSAGE
                            : "최근 변경 이력 조회 중 오류가 발생했습니다."
            );
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public record AuditLogRecord(
            String id,
            @JsonProperty("actor_user_id") String actorUserId,
            String action,
            @JsonProperty("entity_type") String entityType,
            @JsonProperty("entity_id") String entityId,
            String summary,
            @JsonProperty("created_at") String createdAt
    ) {
    }

    public record ProfileRecord(String id, String name) {
    }
}
