package com.academyfollowup.api.message;

import com.academyfollowup.api.global.security.WorkspaceContext;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SendMessageService {

    private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");
    private static final String DUPLICATE_MESSAGE =
            "최근 발송 기록이 있어 중복 발송을 차단했습니다. 같은 학생/사유/수신자에게 이미 문자를 보냈습니다.";

    private final SupabaseMessageSendClient messageSendClient;
    private final MessageLengthMetricsCalculator metricsCalculator;
    private final SolapiClient solapiClient;
    private final Clock clock;

    public SendMessageService(
            SupabaseMessageSendClient messageSendClient,
            MessageLengthMetricsCalculator metricsCalculator,
            SolapiClient solapiClient,
            Clock clock
    ) {
        this.messageSendClient = messageSendClient;
        this.metricsCalculator = metricsCalculator;
        this.solapiClient = solapiClient;
        this.clock = clock;
    }

    public SendMessageResponse send(WorkspaceContext workspaceContext, SendMessageRequest request) {
        String followupId = validateRequest(request);
        var followup = messageSendClient.findFollowup(workspaceContext.academyId(), followupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "발송할 연락 기록을 찾을 수 없습니다."));

        if (followup.student() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "발송할 연락 기록을 찾을 수 없습니다.");
        }

        if (!"active".equals(followup.student().status())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "비활성 학생에게는 문자를 발송할 수 없습니다.");
        }

        var settings = messageSendClient.findSettings(workspaceContext.academyId()).orElse(null);
        boolean allowAssistantSend = settings != null && Boolean.TRUE.equals(settings.allowAssistantSend());

        if (!canSend(workspaceContext, followup.classRecord() == null ? null : followup.classRecord().teacherId(), allowAssistantSend)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "이 연락 기록을 발송할 권한이 없습니다.");
        }

        MessageRecipientType recipientType = MessageRecipientType.from(followup.recipientType());
        if (recipientType == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 문자 수신자입니다.");
        }

        List<MessageRecipient> recipients = recipients(recipientType, followup.student());
        if (recipients.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "발송 가능한 수신자 연락처가 없습니다.");
        }

        MessageLengthMetrics metrics = metricsCalculator.calculate(followup.messageBody());
        if (metrics.isOverLimit()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "문자 본문은 2000byte 이하로 입력해 주세요. 현재 " + metrics.byteCount() + "byte입니다."
            );
        }

        int duplicateGuardMinutes = Math.max(0, settings == null || settings.duplicateGuardMinutes() == null
                ? 1440
                : settings.duplicateGuardMinutes());
        String duplicateWindowStartedAt = duplicateWindowStartedAt(duplicateGuardMinutes);
        boolean duplicate = messageSendClient.hasDuplicateSentFollowup(
                workspaceContext.academyId(),
                followup.studentId(),
                followup.reason(),
                followup.recipientType(),
                duplicateWindowStartedAt
        );
        if (duplicate) {
            throw new DuplicateMessageException(DUPLICATE_MESSAGE, duplicateGuardMinutes);
        }

        boolean dryRun = settings == null || settings.smsDryRun() == null || settings.smsDryRun();
        if (dryRun) {
            saveMessageResult(workspaceContext.academyId(), followup.id(), recipients, "dry_run", null);
            return SendMessageResponse.sent(
                    true,
                    "SMS_DRY_RUN이 활성화되어 실제 문자를 발송하지 않았습니다.",
                    maskedRecipients(recipients),
                    recipients.size(),
                    followup.id()
            );
        }

        try {
            List<MessageRecipient> sentRecipients = new ArrayList<>();
            for (MessageRecipient recipient : recipients) {
                sentRecipients.add(recipient.withProviderMessageId(solapiClient.sendSms(recipient.phone(), followup.messageBody())));
            }
            saveMessageResult(workspaceContext.academyId(), followup.id(), sentRecipients, "sent", null);
            return SendMessageResponse.sent(
                    false,
                    "문자를 발송했습니다.",
                    maskedRecipients(recipients),
                    recipients.size(),
                    followup.id()
            );
        } catch (Exception exception) {
            String errorMessage = exception instanceof RuntimeException && StringUtils.hasText(exception.getMessage())
                    ? exception.getMessage()
                    : "문자 발송에 실패했습니다.";
            saveMessageResult(workspaceContext.academyId(), followup.id(), recipients, "failed", errorMessage);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, errorMessage);
        }
    }

    private String validateRequest(SendMessageRequest request) {
        if (request == null || !StringUtils.hasText(request.followupId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "연락 기록 ID가 필요합니다.");
        }

        return request.followupId().trim();
    }

    private boolean canSend(WorkspaceContext workspaceContext, String classTeacherId, boolean allowAssistantSend) {
        if (workspaceContext.canManageAcademy()) {
            return true;
        }
        if ("teacher".equals(workspaceContext.role())) {
            return workspaceContext.userId().equals(classTeacherId);
        }
        if ("assistant".equals(workspaceContext.role())) {
            return allowAssistantSend && workspaceContext.userId().equals(classTeacherId);
        }
        return false;
    }

    private List<MessageRecipient> recipients(
            MessageRecipientType recipientType,
            SupabaseMessageSendClient.StudentRecord student
    ) {
        List<MessageRecipient> recipients = new ArrayList<>();
        String parentPhone = normalizePhone(student.parentPhone());
        String studentPhone = normalizePhone(student.studentPhone());

        if ((recipientType == MessageRecipientType.PARENT || recipientType == MessageRecipientType.BOTH)
                && StringUtils.hasText(parentPhone)) {
            recipients.add(new MessageRecipient(MessageRecipientType.PARENT, parentPhone, null));
        }
        if ((recipientType == MessageRecipientType.STUDENT || recipientType == MessageRecipientType.BOTH)
                && StringUtils.hasText(studentPhone)) {
            recipients.add(new MessageRecipient(MessageRecipientType.STUDENT, studentPhone, null));
        }

        return recipients;
    }

    private String normalizePhone(String phone) {
        if (phone == null) {
            return "";
        }

        String digits = phone.replaceAll("\\D", "");
        if (digits.length() < 10 || digits.length() > 11) {
            return "";
        }

        return digits;
    }

    private String duplicateWindowStartedAt(int duplicateGuardMinutes) {
        Instant now = Instant.now(clock);
        Instant guardWindowStart = now.minus(duplicateGuardMinutes, ChronoUnit.MINUTES);
        Instant todayStart = ZonedDateTime.ofInstant(now, KOREA_ZONE)
                .toLocalDate()
                .atStartOfDay(KOREA_ZONE)
                .toInstant();
        return (todayStart.isBefore(guardWindowStart) ? todayStart : guardWindowStart).toString();
    }

    private void saveMessageResult(
            String academyId,
            String followupId,
            List<MessageRecipient> recipients,
            String status,
            String errorMessage
    ) {
        String followupStatus = "failed".equals(status) ? "failed" : "sent";
        String sentAt = "failed".equals(status) ? null : Instant.now(clock).toString();
        messageSendClient.insertMessageLogs(academyId, followupId, recipients, status, errorMessage);
        messageSendClient.updateFollowupStatus(academyId, followupId, followupStatus, sentAt);
    }

    private String maskedRecipients(List<MessageRecipient> recipients) {
        return String.join(", ", recipients.stream().map(recipient -> maskPhone(recipient.phone())).toList());
    }

    private String maskPhone(String phone) {
        if (phone.length() < 7) {
            return "연락처 확인";
        }

        return phone.substring(0, 3) + "-****-" + phone.substring(phone.length() - 4);
    }
}
