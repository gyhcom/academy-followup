package com.academyfollowup.api.message;

import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class TemplateRenderer {

    public String render(String templateBody, TemplateValues values) {
        String rendered = normalize(templateBody);
        Map<String, String> replacements = Map.ofEntries(
                Map.entry("academyName", values.academyName()),
                Map.entry("학원명", values.academyName()),
                Map.entry("studentName", values.studentName()),
                Map.entry("학생명", values.studentName()),
                Map.entry("teacherName", values.teacherName()),
                Map.entry("선생님명", values.teacherName()),
                Map.entry("담당선생님", values.teacherName()),
                Map.entry("className", values.className()),
                Map.entry("반명", values.className()),
                Map.entry("makeupCandidateTime", values.makeupCandidateTime()),
                Map.entry("보강후보시간", values.makeupCandidateTime()),
                Map.entry("보강시간", values.makeupCandidateTime())
        );

        for (var entry : replacements.entrySet()) {
            rendered = rendered.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }

        return rendered;
    }

    private String normalize(String body) {
        if (body == null) {
            return "";
        }

        return body
                .replace("\\r\\n", "\n")
                .replace("\\n", "\n")
                .replace("\\r", "\n")
                .replace("\r\n", "\n")
                .replace("\r", "\n");
    }

    public record TemplateValues(
            String academyName,
            String studentName,
            String teacherName,
            String className,
            String makeupCandidateTime
    ) {
    }
}
