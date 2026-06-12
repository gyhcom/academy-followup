package com.academyfollowup.api.management;

import com.academyfollowup.api.audit.AuditLogWriter;
import com.academyfollowup.api.global.security.WorkspaceContext;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ManagementBulkService {

    private static final int MAX_IMPORT_ROWS = 300;
    private static final Set<String> SCHEDULE_TYPES = Set.of("regular_class", "makeup", "external", "consultation");
    private static final Pattern TIME_PATTERN = Pattern.compile("^([01]\\d|2[0-3]):[0-5]\\d$");
    private static final Map<String, String> STATUS_MAP = Map.of(
            "", "active",
            "재원", "active",
            "active", "active",
            "휴원", "paused",
            "paused", "paused",
            "퇴원", "left",
            "left", "left"
    );
    private static final Set<String> CONSENT_TRUE_VALUES =
            Set.of("y", "yes", "true", "1", "동의", "확인", "확인완료", "o", "ㅇ");

    private final SupabaseManagementClient managementClient;
    private final ManagementService managementService;
    private final AuditLogWriter auditLogWriter;

    public ManagementBulkService(
            SupabaseManagementClient managementClient,
            ManagementService managementService,
            AuditLogWriter auditLogWriter
    ) {
        this.managementClient = managementClient;
        this.managementService = managementService;
        this.auditLogWriter = auditLogWriter;
    }

    public BulkStudentResponse createStudents(WorkspaceContext workspaceContext, BulkStudentRequest request) {
        requireAcademyManager(workspaceContext, "학생 일괄 등록은 원장 또는 관리자만 할 수 있습니다.");
        List<BulkStudentRequest.Row> rows = request == null || request.rows() == null ? null : request.rows();
        if (rows == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "등록할 학생 목록이 필요합니다.");
        }
        if (rows.size() > MAX_IMPORT_ROWS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "한 번에 " + MAX_IMPORT_ROWS + "명까지만 등록할 수 있습니다.");
        }

        Map<String, SupabaseManagementClient.ClassRecord> classMap = managementClient
                .findClasses(workspaceContext.academyId())
                .stream()
                .collect(Collectors.toMap((classItem) -> normalizeHeader(classItem.name()), (classItem) -> classItem, (a, b) -> a));
        Set<String> seenInFile = new HashSet<>();
        List<ValidatedStudentRow> validatedRows = rows.stream()
                .filter(this::hasAnyValue)
                .map((row) -> validateStudentRow(row, classMap, seenInFile))
                .toList();
        List<ValidatedStudentRow> validRows = validatedRows.stream()
                .filter((row) -> row.errors().isEmpty())
                .toList();
        List<BulkStudentResponse.InvalidRow> invalidRows = validatedRows.stream()
                .filter((row) -> !row.errors().isEmpty())
                .map((row) -> new BulkStudentResponse.InvalidRow(row.rowNumber(), row.errors()))
                .toList();

        if (validRows.isEmpty()) {
            return invalidResponse("등록 가능한 학생이 없습니다.", invalidRows, validatedRows.size());
        }

        Set<String> existingKeys = managementClient.findStudents(workspaceContext.academyId())
                .stream()
                .map((student) -> student.name().trim() + ":" + student.parentPhone().trim())
                .collect(Collectors.toSet());
        List<ValidatedStudentRow> rowsToInsert = validRows.stream()
                .filter((row) -> !existingKeys.contains(row.name() + ":" + row.normalizedParentPhone()))
                .toList();
        int duplicateCount = validRows.size() - rowsToInsert.size();

        if (rowsToInsert.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 등록된 학생만 포함되어 있습니다.");
        }

        List<StudentPayload> payloads = rowsToInsert.stream()
                .map((row) -> new StudentPayload(
                        null,
                        row.classId(),
                        row.name(),
                        row.schoolName(),
                        row.gradeLabel(),
                        row.parentName(),
                        row.normalizedParentPhone(),
                        row.normalizedStudentPhone(),
                        row.scheduleShareConsentConfirmed(),
                        row.status()
                ))
                .toList();
        List<SupabaseManagementClient.StudentRecord> inserted =
                managementClient.insertStudents(workspaceContext.academyId(), workspaceContext.userId(), payloads);
        for (SupabaseManagementClient.StudentRecord student : inserted) {
            managementService.syncAutomaticScheduleLinks(workspaceContext, student);
        }

        return new BulkStudentResponse(
                inserted.size(),
                duplicateCount,
                invalidRows.size(),
                validatedRows.size(),
                "학생 " + inserted.size() + "명을 등록했습니다.",
                List.of()
        );
    }

    public BulkScheduleResponse createClassSchedules(WorkspaceContext workspaceContext, BulkScheduleRequest request) {
        BulkSchedulePayload payload = parseBulkScheduleRequest(request);
        var classItem = managementClient.findClass(workspaceContext.academyId(), payload.classId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "반을 찾을 수 없습니다."));
        if (!workspaceContext.canAccessAssignedClass(classItem.teacherId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "이 반의 스케줄을 일괄 등록할 권한이 없습니다.");
        }
        if (payload.teacherId() != null && managementClient.findProfile(workspaceContext.academyId(), payload.teacherId()).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "담당 선생님을 찾을 수 없습니다.");
        }

        List<SupabaseManagementClient.StudentRecord> students =
                managementClient.findActiveStudentsByClass(workspaceContext.academyId(), classItem.id());
        if (students.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이 반에 재원 학생이 없어 일괄 등록할 수 없습니다.");
        }

        List<String> studentIds = students.stream().map(SupabaseManagementClient.StudentRecord::id).toList();
        Set<String> duplicateKeys = managementClient.findDuplicateClassSchedules(
                        workspaceContext.academyId(),
                        classItem.id(),
                        payload.scheduleType(),
                        payload.dayOfWeeks(),
                        payload.startTime(),
                        payload.endTime(),
                        studentIds
                )
                .stream()
                .map((schedule) -> schedule.studentId() + ":" + schedule.dayOfWeek())
                .collect(Collectors.toSet());
        List<StudentSchedulePayload> insertTargets = new ArrayList<>();
        for (SupabaseManagementClient.StudentRecord student : students) {
            for (Integer dayOfWeek : payload.dayOfWeeks()) {
                if (duplicateKeys.contains(student.id() + ":" + dayOfWeek)) {
                    continue;
                }
                insertTargets.add(new StudentSchedulePayload(
                        null,
                        student.id(),
                        classItem.id(),
                        payload.teacherId() == null ? classItem.teacherId() : payload.teacherId(),
                        payload.scheduleType(),
                        null,
                        dayOfWeek,
                        payload.startTime(),
                        payload.endTime(),
                        payload.subject() == null ? classItem.subject() : payload.subject(),
                        payload.title(),
                        payload.memo(),
                        true,
                        null
                ));
            }
        }
        int totalTargets = students.size() * payload.dayOfWeeks().size();
        int skippedCount = totalTargets - insertTargets.size();
        if (insertTargets.isEmpty()) {
            return new BulkScheduleResponse(
                    students.size(),
                    totalTargets,
                    payload.dayOfWeeks().size(),
                    0,
                    skippedCount,
                    "선택한 요일 모두에 같은 시간의 활성 스케줄이 이미 등록되어 있습니다."
            );
        }

        managementClient.insertSchedules(workspaceContext.academyId(), insertTargets);
        auditLogWriter.write(
                workspaceContext.academyId(),
                workspaceContext.userId(),
                "schedule.bulk_create",
                "class",
                classItem.id(),
                classItem.name() + " 반 공통 수업 시간 " + insertTargets.size() + "건을 등록했습니다."
        );
        return new BulkScheduleResponse(
                students.size(),
                totalTargets,
                payload.dayOfWeeks().size(),
                insertTargets.size(),
                skippedCount,
                students.size() + "명 기준 " + payload.dayOfWeeks().size() + "개 요일 중 " + insertTargets.size()
                        + "건을 등록했습니다. 중복 " + skippedCount + "건은 건너뛰었습니다."
        );
    }

    private BulkStudentResponse invalidResponse(
            String message,
            List<BulkStudentResponse.InvalidRow> invalidRows,
            int totalRows
    ) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private ValidatedStudentRow validateStudentRow(
            BulkStudentRequest.Row row,
            Map<String, SupabaseManagementClient.ClassRecord> classMap,
            Set<String> seenInFile
    ) {
        List<String> errors = new ArrayList<>();
        int rowNumber = row.rowNumber() == null ? 0 : row.rowNumber();
        String name = optionalText(row.name());
        String className = optionalText(row.className());
        SupabaseManagementClient.ClassRecord classItem =
                className == null ? null : classMap.get(normalizeHeader(className));
        String parentPhone = normalizePhone(row.parentPhone());
        String studentPhone = optionalText(row.studentPhone()) == null ? null : normalizePhone(row.studentPhone());
        String rawStatus = optionalText(row.status());
        String status = STATUS_MAP.getOrDefault(rawStatus == null ? "" : rawStatus.trim().toLowerCase(), null);

        if (name == null) {
            errors.add("학생명이 필요합니다.");
        } else if (name.length() > 40) {
            errors.add("학생명은 40자 이하로 입력해 주세요.");
        }
        if (className != null && classItem == null) {
            errors.add("반 '" + className + "'을 찾을 수 없습니다.");
        }
        if (parentPhone == null) {
            errors.add("학부모 연락처 형식이 올바르지 않습니다.");
        }
        if (optionalText(row.studentPhone()) != null && studentPhone == null) {
            errors.add("학생 연락처 형식이 올바르지 않습니다.");
        }
        if (status == null) {
            errors.add("상태는 재원, 휴원, 퇴원 중 하나여야 합니다.");
            status = "active";
        }
        String duplicateKey = (name == null ? "" : name) + ":" + (parentPhone == null ? optionalText(row.parentPhone()) : parentPhone);
        if (seenInFile.contains(duplicateKey)) {
            errors.add("파일 안에 같은 학생명과 학부모 연락처가 중복됩니다.");
        }
        seenInFile.add(duplicateKey);

        return new ValidatedStudentRow(
                rowNumber,
                name == null ? "" : name,
                className,
                classItem == null ? null : classItem.id(),
                optionalText(row.schoolName()),
                optionalText(row.gradeLabel()),
                optionalText(row.parentName()),
                parentPhone == null ? "" : parentPhone,
                studentPhone,
                parseConsentValue(row.scheduleShareConsentConfirmed()),
                status,
                errors
        );
    }

    private BulkSchedulePayload parseBulkScheduleRequest(BulkScheduleRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문을 읽을 수 없습니다.");
        }
        String classId = optionalText(request.classId());
        if (classId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "반 ID가 필요합니다.");
        }
        if (!SCHEDULE_TYPES.contains(request.scheduleType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 스케줄 유형입니다.");
        }
        List<Integer> dayOfWeeks = parseDayOfWeeks(request);
        if (dayOfWeeks.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요일을 하나 이상 선택해 주세요.");
        }
        String startTime = parseTime(request.startTime());
        String endTime = parseTime(request.endTime());
        if (startTime == null || endTime == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "시작 시간과 종료 시간을 HH:MM 형식으로 입력해 주세요.");
        }
        if (!LocalTime.parse(startTime).isBefore(LocalTime.parse(endTime))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "종료 시간은 시작 시간보다 늦어야 합니다.");
        }
        String title = optionalText(request.title());
        if (title == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "스케줄 제목이 필요합니다.");
        }
        if (title.length() > 80) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "스케줄 제목은 80자 이하로 입력해 주세요.");
        }
        String subject = optionalText(request.subject());
        if (subject != null && subject.length() > 40) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "과목은 40자 이하로 입력해 주세요.");
        }
        String memo = optionalText(request.memo());
        if (memo != null && memo.length() > 300) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "메모는 300자 이하로 입력해 주세요.");
        }
        return new BulkSchedulePayload(
                classId,
                optionalText(request.teacherId()),
                request.scheduleType(),
                dayOfWeeks,
                startTime,
                endTime,
                subject,
                title,
                memo
        );
    }

    private List<Integer> parseDayOfWeeks(BulkScheduleRequest request) {
        Set<Integer> values = new HashSet<>();
        if (request.dayOfWeeks() != null) {
            values.addAll(request.dayOfWeeks());
        }
        if (request.dayOfWeek() != null) {
            values.add(request.dayOfWeek());
        }
        return values.stream()
                .filter((value) -> value != null && value >= 0 && value <= 6)
                .sorted(Comparator.naturalOrder())
                .toList();
    }

    private boolean hasAnyValue(BulkStudentRequest.Row row) {
        return StringUtils.hasText(row.name())
                || StringUtils.hasText(row.className())
                || StringUtils.hasText(row.schoolName())
                || StringUtils.hasText(row.gradeLabel())
                || StringUtils.hasText(row.parentName())
                || StringUtils.hasText(row.parentPhone())
                || StringUtils.hasText(row.studentPhone())
                || StringUtils.hasText(row.scheduleShareConsentConfirmed())
                || StringUtils.hasText(row.status());
    }

    private String optionalText(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private String normalizePhone(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String digits = value.replaceAll("\\D", "");
        return digits.length() >= 8 && digits.length() <= 11 ? digits : null;
    }

    private String normalizeHeader(String value) {
        return (value == null ? "" : value).replace("\uFEFF", "").replaceAll("\\s", "").trim().toLowerCase();
    }

    private boolean parseConsentValue(String value) {
        String normalized = (value == null ? "" : value).replaceAll("\\s", "").trim().toLowerCase();
        return CONSENT_TRUE_VALUES.contains(normalized);
    }

    private String parseTime(String value) {
        String text = optionalText(value);
        if (text == null || !TIME_PATTERN.matcher(text).matches()) {
            return null;
        }
        try {
            LocalTime.parse(text);
            return text;
        } catch (DateTimeParseException exception) {
            return null;
        }
    }

    private void requireAcademyManager(WorkspaceContext workspaceContext, String message) {
        if (!workspaceContext.canManageAcademy()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, message);
        }
    }

    private record ValidatedStudentRow(
            int rowNumber,
            String name,
            String className,
            String classId,
            String schoolName,
            String gradeLabel,
            String parentName,
            String normalizedParentPhone,
            String normalizedStudentPhone,
            boolean scheduleShareConsentConfirmed,
            String status,
            List<String> errors
    ) {
    }

    private record BulkSchedulePayload(
            String classId,
            String teacherId,
            String scheduleType,
            List<Integer> dayOfWeeks,
            String startTime,
            String endTime,
            String subject,
            String title,
            String memo
    ) {
    }
}
