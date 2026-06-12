package com.academyfollowup.api.message;

import com.academyfollowup.api.global.security.WorkspaceContext;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BulkMessageSendService {

    private final BulkMessageRecipientResolver recipientResolver;
    private final SupabaseBulkMessageClient bulkMessageClient;
    private final MessageLengthMetricsCalculator metricsCalculator;
    private final SolapiClient solapiClient;

    public BulkMessageSendService(
            BulkMessageRecipientResolver recipientResolver,
            SupabaseBulkMessageClient bulkMessageClient,
            MessageLengthMetricsCalculator metricsCalculator,
            SolapiClient solapiClient
    ) {
        this.recipientResolver = recipientResolver;
        this.bulkMessageClient = bulkMessageClient;
        this.metricsCalculator = metricsCalculator;
        this.solapiClient = solapiClient;
    }

    public BulkMessageSendResponse send(WorkspaceContext workspaceContext, BulkMessageSendRequest request) {
        if (!workspaceContext.canManageAcademy()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "전체문자는 원장 또는 관리자만 보낼 수 있습니다.");
        }

        ValidatedRequest validatedRequest = validate(request);
        BulkMessageRecipientResolution resolution = recipientResolver.resolve(
                workspaceContext,
                validatedRequest.targetType(),
                validatedRequest.classId(),
                validatedRequest.gradeLabel(),
                validatedRequest.recipientType().value(),
                validatedRequest.excludeDuplicateRecipients()
        );
        var settings = bulkMessageClient.findSettings(workspaceContext.academyId()).orElse(null);
        boolean dryRun = settings == null || settings.smsDryRun() == null || settings.smsDryRun();

        List<SupabaseBulkMessageClient.CreatedFollowupRecord> followups = bulkMessageClient.insertBulkFollowups(
                workspaceContext.academyId(),
                workspaceContext.userId(),
                validatedRequest.messageBody(),
                resolution.recipients()
        );

        if (dryRun) {
            bulkMessageClient.insertBulkMessageLogs(
                    workspaceContext.academyId(),
                    followups,
                    resolution.recipients(),
                    "dry_run"
            );
            bulkMessageClient.updateFollowupsSent(workspaceContext.academyId(), followupIds(followups));
            return BulkMessageSendResponse.from(
                    true,
                    "전체문자 테스트 발송 기록을 저장했습니다.",
                    resolution.preview()
            );
        }

        List<BulkSentMessageRecipient> sentRecipients = new ArrayList<>();
        for (BulkMessageRecipient recipient : resolution.recipients()) {
            String providerMessageId = solapiClient.sendSms(recipient.phone(), validatedRequest.messageBody());
            sentRecipients.add(BulkSentMessageRecipient.from(recipient, providerMessageId));
        }

        bulkMessageClient.insertBulkSentMessageLogs(
                workspaceContext.academyId(),
                followups,
                sentRecipients,
                "sent"
        );
        bulkMessageClient.updateFollowupsSent(workspaceContext.academyId(), followupIds(followups));

        return BulkMessageSendResponse.from(
                false,
                "전체문자를 발송했습니다.",
                resolution.preview()
        );
    }

    private ValidatedRequest validate(BulkMessageSendRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문을 읽을 수 없습니다.");
        }

        String targetType = request.targetType();
        String classId = trimToNull(request.classId());
        String gradeLabel = trimToNull(request.gradeLabel());
        MessageRecipientType recipientType = MessageRecipientType.from(request.recipientType());

        if (!"all".equals(targetType) && !"class".equals(targetType) && !"grade".equals(targetType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "전체문자 대상 범위를 확인해 주세요.");
        }

        if ("class".equals(targetType) && !StringUtils.hasText(classId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "반을 선택해 주세요.");
        }

        if ("grade".equals(targetType) && !StringUtils.hasText(gradeLabel)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학년을 선택해 주세요.");
        }

        if (recipientType == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 문자 수신자입니다.");
        }

        if (!StringUtils.hasText(request.messageBody())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "전체문자 본문을 입력해 주세요.");
        }

        String messageBody = request.messageBody().replace("\r\n", "\n").replace("\r", "\n").trim();
        MessageLengthMetrics metrics = metricsCalculator.calculate(messageBody);
        if (metrics.isOverLimit()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "문자 본문은 2000byte 이하로 입력해 주세요. 현재 " + metrics.byteCount() + "byte입니다."
            );
        }

        return new ValidatedRequest(
                targetType,
                "class".equals(targetType) ? classId : null,
                "grade".equals(targetType) ? gradeLabel : null,
                recipientType,
                messageBody,
                request.excludeDuplicateRecipients() != Boolean.FALSE
        );
    }

    private List<String> followupIds(List<SupabaseBulkMessageClient.CreatedFollowupRecord> followups) {
        return followups.stream().map(SupabaseBulkMessageClient.CreatedFollowupRecord::id).toList();
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        return value.trim();
    }

    private record ValidatedRequest(
            String targetType,
            String classId,
            String gradeLabel,
            MessageRecipientType recipientType,
            String messageBody,
            boolean excludeDuplicateRecipients
    ) {
    }
}
