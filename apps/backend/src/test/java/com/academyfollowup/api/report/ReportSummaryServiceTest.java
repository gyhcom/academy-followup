package com.academyfollowup.api.report;

import com.academyfollowup.api.global.security.WorkspaceContext;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ReportSummaryServiceTest {

    private final ReportRangeCalculator rangeCalculator = mock(ReportRangeCalculator.class);
    private final SupabaseReportClient reportClient = mock(SupabaseReportClient.class);
    private final MessageLengthCounter messageLengthCounter = new MessageLengthCounter();
    private final ReportSummaryService service = new ReportSummaryService(
            rangeCalculator,
            reportClient,
            messageLengthCounter
    );

    @Test
    void countsReportSummaryLikeNextApi() {
        WorkspaceContext workspace = new WorkspaceContext("user-1", "academy-1", "owner", "active");
        ReportRangeBounds bounds = new ReportRangeBounds(
                "2026-06-10",
                "2026-06-10",
                "2026-06-10T00:00:00+09:00",
                "2026-06-11T00:00:00+09:00",
                "오늘"
        );

        when(rangeCalculator.calculate(ReportRange.TODAY)).thenReturn(bounds);
        when(reportClient.findAttendance("academy-1", bounds)).thenReturn(List.of(
                new SupabaseReportClient.AttendanceRecord("present"),
                new SupabaseReportClient.AttendanceRecord("late"),
                new SupabaseReportClient.AttendanceRecord("pending")
        ));
        when(reportClient.findFollowups("academy-1", bounds)).thenReturn(List.of(
                new SupabaseReportClient.FollowupRecord("짧은 문자"),
                new SupabaseReportClient.FollowupRecord("가".repeat(60))
        ));
        when(reportClient.findMessageLogs("academy-1", bounds)).thenReturn(List.of(
                new SupabaseReportClient.MessageLogRecord("dry_run"),
                new SupabaseReportClient.MessageLogRecord("failed")
        ));
        when(reportClient.findStudents("academy-1")).thenReturn(List.of(
                new SupabaseReportClient.StudentRecord("student-1", "active"),
                new SupabaseReportClient.StudentRecord("student-2", "active"),
                new SupabaseReportClient.StudentRecord("student-3", "inactive")
        ));
        when(reportClient.findClasses("academy-1")).thenReturn(List.of(
                new SupabaseReportClient.ClassRecord("class-1"),
                new SupabaseReportClient.ClassRecord("class-2")
        ));
        when(reportClient.findActiveSchedules("academy-1")).thenReturn(List.of(
                new SupabaseReportClient.ScheduleRecord("student-1", true)
        ));
        when(reportClient.findAuditLogs("academy-1", bounds)).thenReturn(List.of(
                new SupabaseReportClient.AuditRecord("audit-1")
        ));

        ReportSummaryResponse response = service.getSummary(workspace, ReportRange.TODAY);

        assertThat(response.summary().attendance().total()).isEqualTo(3);
        assertThat(response.summary().attendance().present()).isEqualTo(1);
        assertThat(response.summary().attendance().late()).isEqualTo(1);
        assertThat(response.summary().attendance().pending()).isEqualTo(1);
        assertThat(response.summary().messages().followups()).isEqualTo(2);
        assertThat(response.summary().messages().logs()).isEqualTo(2);
        assertThat(response.summary().messages().dryRun()).isEqualTo(1);
        assertThat(response.summary().messages().failed()).isEqualTo(1);
        assertThat(response.summary().messages().sms()).isEqualTo(1);
        assertThat(response.summary().messages().lms()).isEqualTo(1);
        assertThat(response.summary().students().active()).isEqualTo(2);
        assertThat(response.summary().students().classes()).isEqualTo(2);
        assertThat(response.summary().students().missingSchedule()).isEqualTo(1);
        assertThat(response.summary().audit().count()).isEqualTo(1);
    }

    @Test
    void blocksTeacherRole() {
        WorkspaceContext workspace = new WorkspaceContext("user-1", "academy-1", "teacher", "active");

        assertThatThrownBy(() -> service.getSummary(workspace, ReportRange.TODAY))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("운영 리포트는 원장/관리자만 볼 수 있습니다.");
    }
}
