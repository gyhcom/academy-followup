package com.academyfollowup.api.management;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ClassResponse(@JsonProperty("class") ClassItem classItem) {
    public record ClassItem(
            String id,
            String name,
            String subject,
            String gradeLabel,
            String teacherId
    ) {
    }
}
