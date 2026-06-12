package com.academyfollowup.api.management;

public record StudentResponse(StudentItem student) {

    public record StudentItem(
            String id,
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
}
