package com.academyfollowup.api.management;

import java.util.List;

public record BulkStudentRequest(List<Row> rows) {

    public record Row(
            Integer rowNumber,
            String name,
            String className,
            String schoolName,
            String gradeLabel,
            String parentName,
            String parentPhone,
            String studentPhone,
            String scheduleShareConsentConfirmed,
            String status
    ) {
    }
}
