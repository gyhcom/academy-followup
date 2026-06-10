package com.academyfollowup.api.report;

import com.academyfollowup.api.global.security.WorkspaceContext;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ReportSummaryService {

    private final ReportRangeCalculator rangeCalculator;
    private final SupabaseReportClient reportClient;
    private final MessageLengthCounter messageLengthCounter;

    public ReportSummaryService(
            ReportRangeCalculator rangeCalculator,
            SupabaseReportClient reportClient,
            MessageLengthCounter messageLengthCounter
    ) {
        this.rangeCalculator = rangeCalculator;
        this.reportClient = reportClient;
        this.messageLengthCounter = messageLengthCounter;
    }

    public ReportSummaryResponse getSummary(WorkspaceContext workspaceContext, ReportRange range) {
        if (!workspaceContext.canManageAcademy()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "운영 리포트는 원장/관리자만 볼 수 있습니다.");
        }

        ReportRangeBounds bounds = rangeCalculator.calculate(range);
        ReportData reportData = fetchReportData(workspaceContext.academyId(), bounds);

        var activeStudents = reportData.students().stream()
                .filter(student -> "active".equals(student.status()))
                .toList();
        Set<String> scheduleStudentIds = reportData.schedules().stream()
                .map(SupabaseReportClient.ScheduleRecord::studentId)
                .collect(Collectors.toSet());

        return new ReportSummaryResponse(new ReportSummaryResponse.ReportSummary(
                range.value(),
                bounds.label(),
                countAttendance(reportData.attendance()),
                countMessages(reportData.followups(), reportData.messageLogs()),
                new ReportSummaryResponse.Students(
                        activeStudents.size(),
                        reportData.classes().size(),
                        (int) activeStudents.stream()
                                .filter(student -> !scheduleStudentIds.contains(student.id()))
                                .count()
                ),
                new ReportSummaryResponse.Audit(reportData.auditLogs().size())
        ));
    }

    private ReportData fetchReportData(String academyId, ReportRangeBounds bounds) {
        return new ReportData(
                reportClient.findAttendance(academyId, bounds),
                reportClient.findFollowups(academyId, bounds),
                reportClient.findMessageLogs(academyId, bounds),
                reportClient.findStudents(academyId),
                reportClient.findClasses(academyId),
                reportClient.findActiveSchedules(academyId),
                reportClient.findAuditLogs(academyId, bounds)
        );
    }

    private ReportSummaryResponse.Attendance countAttendance(
            java.util.List<SupabaseReportClient.AttendanceRecord> records
    ) {
        int present = 0;
        int late = 0;
        int absent = 0;
        int needsCheck = 0;
        int makeup = 0;
        int pending = 0;

        for (var record : records) {
            if ("present".equals(record.status())) {
                present += 1;
            } else if ("late".equals(record.status())) {
                late += 1;
            } else if ("absent".equals(record.status())) {
                absent += 1;
            } else if ("needs_check".equals(record.status())) {
                needsCheck += 1;
            } else if ("makeup".equals(record.status())) {
                makeup += 1;
            } else if ("pending".equals(record.status())) {
                pending += 1;
            }
        }

        return new ReportSummaryResponse.Attendance(
                records.size(),
                present,
                late,
                absent,
                needsCheck,
                makeup,
                pending
        );
    }

    private ReportSummaryResponse.Messages countMessages(
            java.util.List<SupabaseReportClient.FollowupRecord> followups,
            java.util.List<SupabaseReportClient.MessageLogRecord> logs
    ) {
        int sms = 0;
        int lms = 0;
        int overLimit = 0;

        for (var followup : followups) {
            var transportType = messageLengthCounter.getTransportType(followup.messageBody());
            if (transportType == MessageLengthCounter.TransportType.OVER_LIMIT) {
                overLimit += 1;
            } else if (transportType == MessageLengthCounter.TransportType.LMS) {
                lms += 1;
            } else {
                sms += 1;
            }
        }

        return new ReportSummaryResponse.Messages(
                followups.size(),
                logs.size(),
                (int) logs.stream().filter(log -> "dry_run".equals(log.status())).count(),
                (int) logs.stream().filter(log -> "sent".equals(log.status())).count(),
                (int) logs.stream().filter(log -> "failed".equals(log.status())).count(),
                sms,
                lms,
                overLimit
        );
    }

    private record ReportData(
            java.util.List<SupabaseReportClient.AttendanceRecord> attendance,
            java.util.List<SupabaseReportClient.FollowupRecord> followups,
            java.util.List<SupabaseReportClient.MessageLogRecord> messageLogs,
            java.util.List<SupabaseReportClient.StudentRecord> students,
            java.util.List<SupabaseReportClient.ClassRecord> classes,
            java.util.List<SupabaseReportClient.ScheduleRecord> schedules,
            java.util.List<SupabaseReportClient.AuditRecord> auditLogs
    ) {
    }
}
