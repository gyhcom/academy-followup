package com.academyfollowup.api.report;

import com.academyfollowup.api.global.security.WorkspaceContext;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
public class ReportSummaryController {

    private final ReportSummaryService reportSummaryService;

    public ReportSummaryController(ReportSummaryService reportSummaryService) {
        this.reportSummaryService = reportSummaryService;
    }

    @GetMapping("/summary")
    public ReportSummaryResponse summary(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestParam(name = "range", defaultValue = "today") String range
    ) {
        return reportSummaryService.getSummary(workspaceContext, ReportRange.from(range));
    }
}
