package com.academyfollowup.api.message;

import com.academyfollowup.api.audit.AuditLogWriter;
import com.academyfollowup.api.global.security.WorkspaceContext;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MessageTemplateService {

    private final SupabaseMessageClient messageClient;
    private final MessageLengthMetricsCalculator metricsCalculator;
    private final AuditLogWriter auditLogWriter;

    public MessageTemplateService(
            SupabaseMessageClient messageClient,
            MessageLengthMetricsCalculator metricsCalculator,
            AuditLogWriter auditLogWriter
    ) {
        this.messageClient = messageClient;
        this.metricsCalculator = metricsCalculator;
        this.auditLogWriter = auditLogWriter;
    }

    public List<MessageTemplateResponse.MessageTemplateItem> findTemplates(WorkspaceContext workspaceContext) {
        if (!workspaceContext.canManageAcademy()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "문자 템플릿 관리는 원장 또는 관리자만 할 수 있습니다.");
        }

        Map<String, SupabaseMessageClient.TemplateRecord> templatesByReason = messageClient
                .findTemplates(workspaceContext.academyId())
                .stream()
                .collect(Collectors.toMap(SupabaseMessageClient.TemplateRecord::reason, Function.identity(), (left, right) -> left));

        return Arrays.stream(FollowupReason.values())
                .map(reason -> {
                    var template = templatesByReason.get(reason.value());
                    return new MessageTemplateResponse.MessageTemplateItem(
                            template == null ? null : template.id(),
                            reason.value(),
                            reason.label(),
                            template == null ? reason.defaultTitle() : template.title(),
                            template == null ? reason.defaultTemplate() : template.body(),
                            template == null || template.active()
                    );
                })
                .toList();
    }

    public MessageTemplateSaveResponse saveTemplate(
            WorkspaceContext workspaceContext,
            MessageTemplateSaveRequest request
    ) {
        if (!workspaceContext.canManageAcademy()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "문자 템플릿 관리는 원장 또는 관리자만 할 수 있습니다.");
        }

        FollowupReason reason = FollowupReason.from(request.reason());
        if (reason == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 템플릿 사유입니다.");
        }

        String title = trimToNull(request.title());
        String body = trimToNull(request.body());

        if (!StringUtils.hasText(title)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "템플릿 제목이 필요합니다.");
        }

        if (!StringUtils.hasText(body)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "템플릿 본문이 필요합니다.");
        }

        if (title.length() > 80) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "템플릿 제목은 80자 이하로 입력해 주세요.");
        }

        if (body.length() > 1000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "템플릿 본문은 1000자 이하로 입력해 주세요.");
        }

        if (metricsCalculator.calculate(body).isOverLimit()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문자 내용은 2000byte 이하로 입력해 주세요.");
        }

        var template = messageClient.upsertTemplate(
                workspaceContext.academyId(),
                reason.value(),
                title,
                body,
                request.isActive() != Boolean.FALSE
        ).orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "문자 템플릿을 저장하지 못했습니다."));

        auditLogWriter.write(
                workspaceContext.academyId(),
                workspaceContext.userId(),
                "message_template.update",
                "message_template",
                template.id(),
                reason.label() + " 문자 템플릿을 수정했습니다."
        );

        return new MessageTemplateSaveResponse(new MessageTemplateSaveResponse.TemplateItem(
                template.id(),
                template.reason(),
                template.title(),
                template.body(),
                template.active()
        ));
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        return value.trim();
    }
}
