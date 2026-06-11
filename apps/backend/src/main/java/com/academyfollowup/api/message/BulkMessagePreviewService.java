package com.academyfollowup.api.message;

import com.academyfollowup.api.global.security.WorkspaceContext;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BulkMessagePreviewService {

    private final SupabaseBulkMessageClient bulkMessageClient;

    public BulkMessagePreviewService(SupabaseBulkMessageClient bulkMessageClient) {
        this.bulkMessageClient = bulkMessageClient;
    }

    public BulkMessagePreviewResponse preview(WorkspaceContext workspaceContext, BulkMessagePreviewRequest request) {
        if (!workspaceContext.canManageAcademy()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "전체문자는 원장 또는 관리자만 확인할 수 있습니다.");
        }

        String targetType = request.targetType();
        if (!"all".equals(targetType) && !"class".equals(targetType) && !"grade".equals(targetType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "전체문자 대상 범위를 확인해 주세요.");
        }

        String classId = trimToNull(request.classId());
        String gradeLabel = trimToNull(request.gradeLabel());
        String recipientType = request.recipientType();

        if ("class".equals(targetType) && !StringUtils.hasText(classId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "반을 선택해 주세요.");
        }

        if ("grade".equals(targetType) && !StringUtils.hasText(gradeLabel)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학년을 선택해 주세요.");
        }

        if (!"parent".equals(recipientType) && !"student".equals(recipientType) && !"both".equals(recipientType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 문자 수신자입니다.");
        }

        var classes = bulkMessageClient.findClasses(workspaceContext.academyId());
        var students = bulkMessageClient.findActiveStudents(workspaceContext.academyId());
        var classMap = classes.stream()
                .collect(Collectors.toMap(SupabaseBulkMessageClient.ClassRecord::id, Function.identity(), (left, right) -> left));
        var targetStudents = filterStudents(students, classMap, targetType, classId, gradeLabel);

        if (targetStudents.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "전체문자 대상 학생이 없습니다.");
        }

        var candidateRecipients = targetStudents.stream()
                .flatMap(student -> recipients(student, recipientType).stream())
                .toList();
        var recipients = request.excludeDuplicateRecipients() == Boolean.FALSE
                ? candidateRecipients
                : dedupe(candidateRecipients);

        if (recipients.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "발송 가능한 수신자 연락처가 없습니다.");
        }

        return new BulkMessagePreviewResponse(
                targetStudents.size(),
                candidateRecipients.size(),
                recipients.size(),
                candidateRecipients.size() - recipients.size()
        );
    }

    private List<SupabaseBulkMessageClient.StudentRecord> filterStudents(
            List<SupabaseBulkMessageClient.StudentRecord> students,
            Map<String, SupabaseBulkMessageClient.ClassRecord> classMap,
            String targetType,
            String classId,
            String gradeLabel
    ) {
        if ("class".equals(targetType)) {
            return students.stream()
                    .filter(student -> classId.equals(student.classId()))
                    .toList();
        }

        if ("grade".equals(targetType)) {
            return students.stream()
                    .filter(student -> {
                        String classGrade = student.classId() == null ? null : classMap.getOrDefault(
                                student.classId(),
                                new SupabaseBulkMessageClient.ClassRecord("", null)
                        ).gradeLabel();
                        return gradeLabel.equals(student.gradeLabel()) || gradeLabel.equals(classGrade);
                    })
                    .toList();
        }

        return students;
    }

    private List<Recipient> recipients(SupabaseBulkMessageClient.StudentRecord student, String recipientType) {
        var recipients = new java.util.ArrayList<Recipient>();
        String parentPhone = normalizePhone(student.parentPhone());
        String studentPhone = normalizePhone(student.studentPhone());

        if (("parent".equals(recipientType) || "both".equals(recipientType)) && StringUtils.hasText(parentPhone)) {
            recipients.add(new Recipient(parentPhone));
        }

        if (("student".equals(recipientType) || "both".equals(recipientType)) && StringUtils.hasText(studentPhone)) {
            recipients.add(new Recipient(studentPhone));
        }

        return recipients;
    }

    private List<Recipient> dedupe(List<Recipient> recipients) {
        Set<String> seen = new HashSet<>();
        return recipients.stream()
                .filter(recipient -> seen.add(recipient.phone()))
                .toList();
    }

    private String normalizePhone(String phone) {
        if (phone == null) {
            return "";
        }

        String digits = phone.replaceAll("\\D", "");
        if (digits.length() < 10 || digits.length() > 11) {
            return "";
        }

        return digits;
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        return value.trim();
    }

    private record Recipient(String phone) {
    }
}
