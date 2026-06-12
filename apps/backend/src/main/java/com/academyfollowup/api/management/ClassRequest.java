package com.academyfollowup.api.management;

public record ClassRequest(
        String classId,
        String name,
        String subject,
        String gradeLabel,
        String teacherId
) {
}
