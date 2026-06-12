package com.academyfollowup.api.external;

import com.academyfollowup.api.audit.AuditLogWriter;
import com.academyfollowup.api.global.security.WorkspaceContext;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.Objects;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ExternalAcademyClassService {

    private static final Pattern TIME_PATTERN = Pattern.compile("^([01]\\d|2[0-3]):[0-5]\\d$");
    private static final Pattern DATE_PATTERN = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");

    private final SupabaseExternalClassClient externalClassClient;
    private final AuditLogWriter auditLogWriter;

    public ExternalAcademyClassService(
            SupabaseExternalClassClient externalClassClient,
            AuditLogWriter auditLogWriter
    ) {
        this.externalClassClient = externalClassClient;
        this.auditLogWriter = auditLogWriter;
    }

    public ExternalAcademyClassResponse handle(WorkspaceContext workspaceContext, ExternalAcademyClassRequest request) {
        if (!workspaceContext.canManageAcademy()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "타 학원 수업은 원장/관리자만 등록할 수 있습니다.");
        }
        String action = optionalText(request == null ? null : request.action());
        if (Objects.equals(action, "create_class_and_enroll")) {
            return createClassAndEnroll(workspaceContext, request);
        }
        if (Objects.equals(action, "deactivate_enrollment")) {
            return deactivateEnrollment(workspaceContext, request);
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 요청입니다.");
    }

    private ExternalAcademyClassResponse createClassAndEnroll(
            WorkspaceContext workspaceContext,
            ExternalAcademyClassRequest request
    ) {
        String studentId = optionalText(request.studentId());
        String academyName = optionalText(request.academyName());
        String classTitle = optionalText(request.classTitle());
        String subject = optionalText(request.subject());
        String memo = optionalText(request.memo());
        String scheduleDate = parseDate(optionalText(request.scheduleDate()));
        Integer dayOfWeek = request.dayOfWeek();
        String startTime = parseTime(request.startTime());
        String endTime = parseTime(request.endTime());

        if (studentId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학생 ID가 필요합니다.");
        }
        if (academyName == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "타 학원명을 입력해 주세요.");
        }
        if (classTitle == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "타 학원 수업명을 입력해 주세요.");
        }
        if (academyName.length() > 80 || classTitle.length() > 80) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학원명과 수업명은 80자 이하로 입력해 주세요.");
        }
        if (subject != null && subject.length() > 40) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "과목은 40자 이하로 입력해 주세요.");
        }
        if (memo != null && memo.length() > 300) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "메모는 300자 이하로 입력해 주세요.");
        }
        if (dayOfWeek == null || dayOfWeek < 0 || dayOfWeek > 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요일을 선택해 주세요.");
        }
        if (startTime == null || endTime == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "시작 시간과 종료 시간을 HH:MM 형식으로 입력해 주세요.");
        }
        if (!LocalTime.parse(startTime).isBefore(LocalTime.parse(endTime))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "종료 시간은 시작 시간보다 늦어야 합니다.");
        }
        if (!externalClassClient.studentExists(workspaceContext.academyId(), studentId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "선택한 학생을 찾을 수 없습니다.");
        }

        var externalAcademy = externalClassClient.findActiveExternalAcademies(workspaceContext.academyId())
                .stream()
                .filter((academy) -> normalizeText(academy.name()).equals(normalizeText(academyName)))
                .findFirst()
                .orElseGet(() -> externalClassClient.insertExternalAcademy(
                        workspaceContext.academyId(),
                        academyName,
                        workspaceContext.userId()
                ));
        var externalClass = externalClassClient.findExternalClass(
                        workspaceContext.academyId(),
                        externalAcademy.id(),
                        dayOfWeek,
                        startTime,
                        endTime
                )
                .orElseGet(() -> externalClassClient.insertExternalClass(
                        workspaceContext.academyId(),
                        externalAcademy.id(),
                        classTitle,
                        subject,
                        scheduleDate,
                        dayOfWeek,
                        startTime,
                        endTime,
                        memo,
                        workspaceContext.userId()
                ));
        var enrollment = externalClassClient.findEnrollment(workspaceContext.academyId(), studentId, externalClass.id())
                .map((existing) -> existing.isActive() ? existing : externalClassClient.activateEnrollment(existing.id()))
                .orElseGet(() -> externalClassClient.insertEnrollment(
                        workspaceContext.academyId(),
                        studentId,
                        externalClass.id(),
                        workspaceContext.userId()
                ));

        auditLogWriter.write(
                workspaceContext.academyId(),
                workspaceContext.userId(),
                "external_class.create",
                "external_class",
                externalClass.id(),
                academyName + " " + classTitle + " 타 학원 수업을 연결했습니다."
        );
        return new ExternalAcademyClassResponse("타 학원 수업을 학생에게 연결했습니다.", enrollment.id());
    }

    private ExternalAcademyClassResponse deactivateEnrollment(
            WorkspaceContext workspaceContext,
            ExternalAcademyClassRequest request
    ) {
        String enrollmentId = optionalText(request.enrollmentId());
        if (enrollmentId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "해제할 타 학원 수업 연결 ID가 필요합니다.");
        }
        var updated = externalClassClient.deactivateEnrollment(workspaceContext.academyId(), enrollmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해제할 타 학원 수업 연결을 찾을 수 없습니다."));
        auditLogWriter.write(
                workspaceContext.academyId(),
                workspaceContext.userId(),
                "external_class.delete",
                "external_class",
                updated.id(),
                "타 학원 수업 연결을 해제했습니다."
        );
        return new ExternalAcademyClassResponse("타 학원 수업 연결을 해제했습니다.", null);
    }

    private String optionalText(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private String normalizeText(String value) {
        return value.trim().replaceAll("\\s+", "").toLowerCase();
    }

    private String parseTime(String value) {
        String text = optionalText(value);
        if (text == null || !TIME_PATTERN.matcher(text).matches()) {
            return null;
        }
        try {
            LocalTime.parse(text);
            return text;
        } catch (DateTimeParseException exception) {
            return null;
        }
    }

    private String parseDate(String value) {
        if (value == null) {
            return null;
        }
        if (!DATE_PATTERN.matcher(value).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "날짜 지정 일정은 YYYY-MM-DD 형식으로 입력해 주세요.");
        }
        try {
            LocalDate.parse(value);
            return value;
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "날짜 지정 일정은 YYYY-MM-DD 형식으로 입력해 주세요.");
        }
    }
}
