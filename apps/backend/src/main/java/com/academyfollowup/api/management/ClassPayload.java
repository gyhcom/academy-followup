package com.academyfollowup.api.management;

public record ClassPayload(
        String classId,
        String name,
        String subject,
        String gradeLabel,
        String teacherId
) {
}
