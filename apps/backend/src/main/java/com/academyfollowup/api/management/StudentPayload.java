package com.academyfollowup.api.management;

public record StudentPayload(
        String studentId,
        String classId,
        String name,
        String schoolName,
        String gradeLabel,
        String parentName,
        String parentPhone,
        String studentPhone,
        boolean scheduleShareConsentConfirmed,
        String status
) {
}
