package com.academyfollowup.api.report;

import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class CsvWriter {

    public String write(List<List<String>> rows) {
        return rows.stream()
                .map(row -> row.stream().map(this::escape).reduce((left, right) -> left + "," + right).orElse(""))
                .reduce((left, right) -> left + "\n" + right)
                .orElse("");
    }

    private String escape(String value) {
        String safeValue = value == null ? "" : value;

        if (safeValue.contains("\"")
                || safeValue.contains(",")
                || safeValue.contains("\n")
                || safeValue.contains("\r")) {
            return "\"" + safeValue.replace("\"", "\"\"") + "\"";
        }

        return safeValue;
    }
}
