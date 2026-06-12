package com.academyfollowup.api.report;

import com.academyfollowup.api.global.security.WorkspaceContext;
import java.nio.charset.StandardCharsets;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/reports")
public class ReportExportController {

    private static final MediaType CSV_MEDIA_TYPE = new MediaType("text", "csv", StandardCharsets.UTF_8);

    private final ReportExportService reportExportService;

    public ReportExportController(ReportExportService reportExportService) {
        this.reportExportService = reportExportService;
    }

    @GetMapping("/export")
    public ResponseEntity<String> export(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestParam(name = "type") String type,
            @RequestParam(name = "range", defaultValue = "today") String range,
            @RequestParam(name = "includePrivate", defaultValue = "false") boolean includePrivate
    ) {
        ReportExportType exportType;

        try {
            exportType = ReportExportType.from(type);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage());
        }

        CsvExport csvExport = reportExportService.export(
                workspaceContext,
                exportType,
                ReportRange.from(range),
                includePrivate
        );

        return ResponseEntity.ok()
                .contentType(CSV_MEDIA_TYPE)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(csvExport.filename(), StandardCharsets.UTF_8)
                        .build()
                        .toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body("\uFEFF" + csvExport.csv());
    }
}
