package com.academyfollowup.api.report;

import com.academyfollowup.api.global.security.WorkspaceContext;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ReportExportService {

    private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter TIMESTAMP_FORMATTER = DateTimeFormatter
            .ofLocalizedDateTime(FormatStyle.SHORT, FormatStyle.SHORT)
            .withLocale(java.util.Locale.KOREA)
            .withZone(KOREA_ZONE);

    private final ReportRangeCalculator rangeCalculator;
    private final SupabaseReportExportClient exportClient;
    private final CsvWriter csvWriter;
    private final Clock clock;

    public ReportExportService(
            ReportRangeCalculator rangeCalculator,
            SupabaseReportExportClient exportClient,
            CsvWriter csvWriter,
            Clock clock
    ) {
        this.rangeCalculator = rangeCalculator;
        this.exportClient = exportClient;
        this.csvWriter = csvWriter;
        this.clock = clock;
    }

    public CsvExport export(
            WorkspaceContext workspaceContext,
            ReportExportType type,
            ReportRange range,
            boolean includePrivate
    ) {
        if (!workspaceContext.canManageAcademy()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "운영 리포트는 원장/관리자만 볼 수 있습니다.");
        }

        return switch (type) {
            case STUDENTS -> exportStudents(workspaceContext.academyId(), includePrivate);
            case ATTENDANCE -> exportAttendance(workspaceContext.academyId(), range);
            case MESSAGES -> exportMessages(workspaceContext.academyId(), range, includePrivate);
            case AUDIT -> exportAudit(workspaceContext.academyId(), range);
        };
    }

    private CsvExport exportStudents(String academyId, boolean includePrivate) {
        var students = exportClient.findStudents(academyId);
        List<List<String>> rows = new ArrayList<>();
        rows.add(List.of("학생명", "학교", "학년", "반", "보호자명", "학부모 연락처", "학생 연락처", "공유 동의", "상태"));

        students.forEach(student -> rows.add(List.of(
                text(student.name()),
                text(student.schoolName()),
                text(student.gradeLabel()),
                student.classes() == null ? "" : text(student.classes().name()),
                text(student.parentName()),
                includePrivate ? text(student.parentPhone()) : maskPhone(student.parentPhone()),
                includePrivate ? text(student.studentPhone()) : maskPhone(student.studentPhone()),
                student.scheduleShareConsentConfirmed() ? "동의 확인" : "미확인",
                text(student.status())
        )));

        return new CsvExport("academy-students-" + todayForFilename() + ".csv", csvWriter.write(rows));
    }

    private CsvExport exportAttendance(String academyId, ReportRange range) {
        var bounds = rangeCalculator.calculate(range);
        var attendance = exportClient.findAttendance(academyId, bounds);
        List<List<String>> rows = new ArrayList<>();
        rows.add(List.of("날짜", "시간", "반", "학생명", "상태", "도착시각", "체크시각", "메모"));

        attendance.forEach(record -> rows.add(List.of(
                text(record.attendanceDate()),
                shortTimeRange(record.scheduledStartTime(), record.scheduledEndTime()),
                record.classes() == null ? "" : text(record.classes().name()),
                record.students() == null ? "" : text(record.students().name()),
                text(record.status()),
                formatTimestamp(record.arrivedAt()),
                formatTimestamp(record.checkedAt()),
                text(record.note())
        )));

        return new CsvExport("academy-attendance-" + todayForFilename() + ".csv", csvWriter.write(rows));
    }

    private CsvExport exportMessages(String academyId, ReportRange range, boolean includePrivate) {
        var bounds = rangeCalculator.calculate(range);
        var followups = exportClient.findFollowups(academyId, bounds);
        var followupIds = followups.stream().map(SupabaseReportExportClient.FollowupExportRecord::id).toList();
        Map<String, List<SupabaseReportExportClient.MessageLogExportRecord>> logsByFollowupId =
                exportClient.findMessageLogs(academyId, followupIds).stream()
                        .filter(log -> log.followupId() != null)
                        .collect(Collectors.groupingBy(SupabaseReportExportClient.MessageLogExportRecord::followupId));

        List<List<String>> rows = new ArrayList<>();
        rows.add(List.of("생성일", "학생명", "반", "사유", "수신자", "상태", "발송로그", "수신번호", "본문"));

        followups.forEach(followup -> {
            var logs = logsByFollowupId.getOrDefault(followup.id(), List.of());
            var firstLog = logs.isEmpty() ? null : logs.getFirst();
            var student = followup.students();
            String phone = firstLog != null
                    ? firstLog.recipientPhone()
                    : phoneFromFollowupRecipient(followup.recipientType(), student);

            rows.add(List.of(
                    formatTimestamp(followup.createdAt()),
                    student == null ? "" : text(student.name()),
                    followup.classes() == null ? "" : text(followup.classes().name()),
                    text(followup.reason()),
                    text(followup.recipientType()),
                    text(followup.status()),
                    logs.stream()
                            .map(SupabaseReportExportClient.MessageLogExportRecord::status)
                            .collect(Collectors.joining(" / ")),
                    includePrivate ? text(phone) : maskPhone(phone),
                    text(followup.messageBody())
            ));
        });

        return new CsvExport("academy-messages-" + todayForFilename() + ".csv", csvWriter.write(rows));
    }

    private CsvExport exportAudit(String academyId, ReportRange range) {
        var bounds = rangeCalculator.calculate(range);
        var logs = exportClient.findAuditLogs(academyId, bounds);
        var memberNameById = exportClient.findMembers(academyId).stream()
                .collect(Collectors.toMap(
                        SupabaseReportExportClient.MemberRecord::id,
                        SupabaseReportExportClient.MemberRecord::name,
                        (left, right) -> left
                ));

        List<List<String>> rows = new ArrayList<>();
        rows.add(List.of("일시", "작업자", "액션", "대상", "대상 ID", "요약"));

        logs.forEach(log -> rows.add(List.of(
                formatTimestamp(log.createdAt()),
                log.actorUserId() == null ? "시스템" : memberNameById.getOrDefault(log.actorUserId(), "시스템"),
                text(log.action()),
                text(log.entityType()),
                text(log.entityId()),
                text(log.summary())
        )));

        return new CsvExport("academy-audit-" + todayForFilename() + ".csv", csvWriter.write(rows));
    }

    private String phoneFromFollowupRecipient(
            String recipientType,
            SupabaseReportExportClient.StudentContact student
    ) {
        if (student == null) {
            return "";
        }

        return "student".equals(recipientType) ? text(student.studentPhone()) : text(student.parentPhone());
    }

    private String shortTimeRange(String startTime, String endTime) {
        return shortTime(startTime) + "-" + shortTime(endTime);
    }

    private String shortTime(String value) {
        if (value == null || value.length() < 5) {
            return "";
        }

        return value.substring(0, 5);
    }

    private String formatTimestamp(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        Instant instant = OffsetDateTime.parse(value).toInstant();

        return TIMESTAMP_FORMATTER.format(instant);
    }

    private String todayForFilename() {
        return LocalDate.now(clock.withZone(KOREA_ZONE)).toString();
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return "";
        }

        String digits = phone.replaceAll("\\D", "");

        if (digits.length() < 7) {
            return phone;
        }

        return digits.substring(0, 3) + "-****-" + digits.substring(digits.length() - 4);
    }

    private String text(String value) {
        return value == null ? "" : value;
    }
}
