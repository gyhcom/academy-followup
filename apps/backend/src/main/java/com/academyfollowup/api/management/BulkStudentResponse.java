package com.academyfollowup.api.management;

import java.util.List;

public record BulkStudentResponse(
        int insertedCount,
        int duplicateCount,
        int invalidCount,
        int totalRows,
        String message,
        List<InvalidRow> invalidRows
) {

    public record InvalidRow(int rowNumber, List<String> errors) {
    }
}
