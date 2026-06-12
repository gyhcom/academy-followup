package com.academyfollowup.api.management;

public record StudentRequest(
        String studentId,
        String classId,
        String name,
        String schoolName,
        String gradeLabel,
        String parentName,
        String parentPhone,
        String studentPhone,
        Boolean scheduleShareConsentConfirmed,
        String status
) {
}
