package com.academyfollowup.api.report;

import com.academyfollowup.api.global.security.WorkspaceContext;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ReportExportServiceTest {

    private final ReportRangeCalculator rangeCalculator = mock(ReportRangeCalculator.class);
    private final SupabaseReportExportClient exportClient = mock(SupabaseReportExportClient.class);
    private final ReportExportService service = new ReportExportService(
            rangeCalculator,
            exportClient,
            new CsvWriter(),
            Clock.fixed(Instant.parse("2026-06-10T00:00:00Z"), ZoneId.of("Asia/Seoul"))
    );

    @Test
    void exportsStudentsWithMaskedPhoneByDefault() {
        WorkspaceContext workspace = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(exportClient.findStudents("academy-1")).thenReturn(List.of(
                new SupabaseReportExportClient.StudentExportRecord(
                        "김민준",
                        "한빛중",
                        "중2",
                        "김보호",
                        "010-1111-2222",
                        "010-3333-4444",
                        "active",
                        true,
                        new SupabaseReportExportClient.ClassName("중2 수학 A반")
                )
        ));

        CsvExport export = service.export(workspace, ReportExportType.STUDENTS, ReportRange.TODAY, false);

        assertThat(export.filename()).isEqualTo("academy-students-2026-06-10.csv");
        assertThat(export.csv()).contains("김민준");
        assertThat(export.csv()).contains("010-****-2222");
        assertThat(export.csv()).contains("010-****-4444");
        assertThat(export.csv()).doesNotContain("010-1111-2222");
    }

    @Test
    void exportsStudentPrivatePhoneWhenRequested() {
        WorkspaceContext workspace = new WorkspaceContext("manager-1", "academy-1", "manager", "active");
        when(exportClient.findStudents("academy-1")).thenReturn(List.of(
                new SupabaseReportExportClient.StudentExportRecord(
                        "김민준",
                        null,
                        null,
                        null,
                        "010-1111-2222",
                        null,
                        "active",
                        false,
                        null
                )
        ));

        CsvExport export = service.export(workspace, ReportExportType.STUDENTS, ReportRange.TODAY, true);

        assertThat(export.csv()).contains("010-1111-2222");
    }

    @Test
    void exportsMessagesWithLogPhoneAndEscapedBody() {
        WorkspaceContext workspace = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        ReportRangeBounds bounds = new ReportRangeBounds(
                "2026-06-10",
                "2026-06-10",
                "2026-06-10T00:00:00+09:00",
                "2026-06-11T00:00:00+09:00",
                "오늘"
        );
        when(rangeCalculator.calculate(ReportRange.TODAY)).thenReturn(bounds);
        when(exportClient.findFollowups("academy-1", bounds)).thenReturn(List.of(
                new SupabaseReportExportClient.FollowupExportRecord(
                        "followup-1",
                        "absence",
                        "결석, 안내",
                        "parent",
                        "draft",
                        null,
                        "2026-06-10T10:00:00+09:00",
                        new SupabaseReportExportClient.StudentContact("김민준", "010-1111-2222", null),
                        new SupabaseReportExportClient.ClassName("중2 수학 A반")
                )
        ));
        when(exportClient.findMessageLogs("academy-1", List.of("followup-1"))).thenReturn(List.of(
                new SupabaseReportExportClient.MessageLogExportRecord(
                        "followup-1",
                        "solapi",
                        "parent",
                        "010-9999-8888",
                        "dry_run",
                        null,
                        "2026-06-10T10:01:00+09:00"
                )
        ));

        CsvExport export = service.export(workspace, ReportExportType.MESSAGES, ReportRange.TODAY, false);

        assertThat(export.csv()).contains("dry_run");
        assertThat(export.csv()).contains("010-****-8888");
        assertThat(export.csv()).contains("\"결석, 안내\"");
    }

    @Test
    void blocksTeacherRole() {
        WorkspaceContext workspace = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");

        assertThatThrownBy(() -> service.export(workspace, ReportExportType.STUDENTS, ReportRange.TODAY, false))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("운영 리포트는 원장/관리자만 볼 수 있습니다.");
    }
}
