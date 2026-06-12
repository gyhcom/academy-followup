package com.academyfollowup.api.message;

import com.academyfollowup.api.global.security.WorkspaceContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BulkMessagePreviewService {

    private final BulkMessageRecipientResolver recipientResolver;

    public BulkMessagePreviewService(BulkMessageRecipientResolver recipientResolver) {
        this.recipientResolver = recipientResolver;
    }

    public BulkMessagePreviewResponse preview(WorkspaceContext workspaceContext, BulkMessagePreviewRequest request) {
        if (!workspaceContext.canManageAcademy()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "전체문자는 원장 또는 관리자만 확인할 수 있습니다.");
        }

        String targetType = request.targetType();
        if (!"all".equals(targetType) && !"class".equals(targetType) && !"grade".equals(targetType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "전체문자 대상 범위를 확인해 주세요.");
        }

        String classId = trimToNull(request.classId());
        String gradeLabel = trimToNull(request.gradeLabel());
        String recipientType = request.recipientType();

        if ("class".equals(targetType) && !StringUtils.hasText(classId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "반을 선택해 주세요.");
        }

        if ("grade".equals(targetType) && !StringUtils.hasText(gradeLabel)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학년을 선택해 주세요.");
        }

        if (!"parent".equals(recipientType) && !"student".equals(recipientType) && !"both".equals(recipientType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 문자 수신자입니다.");
        }

        return recipientResolver.resolve(
                workspaceContext,
                targetType,
                classId,
                gradeLabel,
                recipientType,
                request.excludeDuplicateRecipients() != Boolean.FALSE
        ).preview();
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        return value.trim();
    }
}
