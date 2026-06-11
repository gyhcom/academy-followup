package com.academyfollowup.api.message;

import com.academyfollowup.api.global.security.WorkspaceContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MessagePreviewService {

    private final SupabaseMessageClient messageClient;
    private final TemplateRenderer templateRenderer;
    private final MessageLengthMetricsCalculator metricsCalculator;

    public MessagePreviewService(
            SupabaseMessageClient messageClient,
            TemplateRenderer templateRenderer,
            MessageLengthMetricsCalculator metricsCalculator
    ) {
        this.messageClient = messageClient;
        this.templateRenderer = templateRenderer;
        this.metricsCalculator = metricsCalculator;
    }

    public MessagePreviewResponse preview(WorkspaceContext workspaceContext, MessagePreviewRequest request) {
        if (!StringUtils.hasText(request.studentId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학생 ID가 필요합니다.");
        }

        FollowupReason reason = FollowupReason.from(request.reason());
        if (reason == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 연락 사유입니다.");
        }

        String makeupCandidateTime = StringUtils.hasText(request.makeupCandidateTime())
                ? request.makeupCandidateTime().trim()
                : null;
        if (makeupCandidateTime != null && makeupCandidateTime.length() > 80) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "보강 후보 시간 형식이 올바르지 않습니다.");
        }

        var profile = messageClient.findProfile(workspaceContext.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "학원 워크스페이스 연결이 필요합니다."));
        var academy = messageClient.findAcademy(workspaceContext.academyId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "학원 워크스페이스 연결이 필요합니다."));
        var student = messageClient.findStudent(workspaceContext.academyId(), request.studentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "선택한 학생을 찾을 수 없습니다."));

        if (!"active".equals(student.status())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "비활성 학생은 문자 미리보기를 만들 수 없습니다.");
        }

        SupabaseMessageClient.ClassRecord classRecord = null;
        if (StringUtils.hasText(student.classId())) {
            classRecord = messageClient.findClass(workspaceContext.academyId(), student.classId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "반 정보를 확인하지 못했습니다."));
        }

        if (!workspaceContext.canAccessAssignedClass(classRecord == null ? null : classRecord.teacherId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "이 학생의 문자 미리보기를 만들 권한이 없습니다.");
        }

        var template = messageClient.findActiveTemplate(workspaceContext.academyId(), reason.value()).orElse(null);
        String senderName = StringUtils.hasText(academy.senderName()) ? academy.senderName() : academy.name();
        String body = templateRenderer.render(
                template == null ? reason.defaultTemplate() : template.body(),
                new TemplateRenderer.TemplateValues(
                        senderName,
                        student.name(),
                        profile.name(),
                        classRecord == null ? "" : classRecord.name(),
                        makeupCandidateTime == null ? "협의 가능한" : makeupCandidateTime
                )
        );

        return new MessagePreviewResponse(
                template == null ? null : template.id(),
                template == null ? reason.defaultTitle() : template.title(),
                body,
                metricsCalculator.calculate(body),
                reason.value(),
                new MessagePreviewResponse.StudentItem(student.id(), student.name())
        );
    }
}
