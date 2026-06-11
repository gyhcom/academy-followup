package com.academyfollowup.api.settings;

import com.academyfollowup.api.audit.AuditLogWriter;
import com.academyfollowup.api.global.security.WorkspaceContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AcademySettingsService {

    private final SupabaseAcademySettingsClient settingsClient;
    private final AuditLogWriter auditLogWriter;

    public AcademySettingsService(
            SupabaseAcademySettingsClient settingsClient,
            AuditLogWriter auditLogWriter
    ) {
        this.settingsClient = settingsClient;
        this.auditLogWriter = auditLogWriter;
    }

    public AcademySettingsResponse saveSettings(
            WorkspaceContext workspaceContext,
            AcademySettingsRequest request
    ) {
        if (!workspaceContext.canManageAcademy()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "설정 관리는 원장 또는 관리자만 할 수 있습니다.");
        }

        var parsed = parse(request);
        settingsClient.updateAcademy(
                workspaceContext.academyId(),
                parsed.academyName(),
                parsed.senderName(),
                parsed.senderPhone()
        );
        settingsClient.upsertSettings(
                workspaceContext.academyId(),
                parsed.smsDryRun(),
                parsed.duplicateGuardMinutes(),
                parsed.allowAssistantSend()
        );

        auditLogWriter.write(
                workspaceContext.academyId(),
                workspaceContext.userId(),
                "academy_settings.update",
                "academy_settings",
                workspaceContext.academyId(),
                "학원 운영 설정을 수정했습니다."
        );

        return new AcademySettingsResponse(new AcademySettingsResponse.Settings(
                parsed.academyName(),
                parsed.senderName(),
                parsed.senderPhone(),
                parsed.smsDryRun(),
                parsed.duplicateGuardMinutes(),
                parsed.allowAssistantSend()
        ));
    }

    private ParsedSettings parse(AcademySettingsRequest request) {
        String academyName = optionalText(request.academyName());

        if (!StringUtils.hasText(academyName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학원명이 필요합니다.");
        }

        if (academyName.length() > 80) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학원명은 80자 이하로 입력해 주세요.");
        }

        Integer duplicateGuardMinutes = request.duplicateGuardMinutes();
        if (duplicateGuardMinutes == null || duplicateGuardMinutes < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "중복 발송 방지 시간은 0 이상의 정수로 입력해 주세요.");
        }

        return new ParsedSettings(
                academyName,
                optionalText(request.senderName()),
                normalizePhone(request.senderPhone()),
                request.smsDryRun() == Boolean.TRUE,
                duplicateGuardMinutes,
                request.allowAssistantSend() == Boolean.TRUE
        );
    }

    private String optionalText(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        return value.trim();
    }

    private String normalizePhone(String value) {
        String text = optionalText(value);

        if (!StringUtils.hasText(text)) {
            return null;
        }

        String digits = text.replaceAll("\\D", "");
        return digits.length() >= 9 && digits.length() <= 11 ? digits : null;
    }

    private record ParsedSettings(
            String academyName,
            String senderName,
            String senderPhone,
            boolean smsDryRun,
            int duplicateGuardMinutes,
            boolean allowAssistantSend
    ) {
    }
}
