package com.academyfollowup.api.management;

import com.academyfollowup.api.audit.AuditLogWriter;
import com.academyfollowup.api.global.security.WorkspaceContext;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ManagementService {

    private static final Set<String> STUDENT_STATUSES = Set.of("active", "paused", "left");
    private static final Set<String> SCHEDULE_TYPES = Set.of("regular_class", "makeup", "external", "consultation");
    private static final Pattern TIME_PATTERN = Pattern.compile("^([01]\\d|2[0-3]):[0-5]\\d$");
    private static final Pattern DATE_PATTERN = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");

    private final SupabaseManagementClient managementClient;
    private final AuditLogWriter auditLogWriter;

    public ManagementService(SupabaseManagementClient managementClient, AuditLogWriter auditLogWriter) {
        this.managementClient = managementClient;
        this.auditLogWriter = auditLogWriter;
    }

    public ClassResponse.ClassItem createClass(WorkspaceContext workspaceContext, ClassRequest request) {
        requireAcademyManager(workspaceContext, "반 관리는 원장 또는 관리자만 할 수 있습니다.");
        ClassPayload payload = parseClassRequest(request, false);
        validateTeacher(workspaceContext.academyId(), payload.teacherId());

        var saved = managementClient.insertClass(workspaceContext.academyId(), payload);
        auditLogWriter.write(
                workspaceContext.academyId(),
                workspaceContext.userId(),
                "class.create",
                "class",
                saved.id(),
                saved.name() + " 반을 등록했습니다."
        );
        return toClassResponse(saved);
    }

    public ClassResponse.ClassItem updateClass(WorkspaceContext workspaceContext, ClassRequest request) {
        requireAcademyManager(workspaceContext, "반 관리는 원장 또는 관리자만 할 수 있습니다.");
        ClassPayload payload = parseClassRequest(request, true);
        validateTeacher(workspaceContext.academyId(), payload.teacherId());

        var saved = managementClient.updateClass(workspaceContext.academyId(), payload)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "수정할 반을 찾을 수 없습니다."));
        auditLogWriter.write(
                workspaceContext.academyId(),
                workspaceContext.userId(),
                "class.update",
                "class",
                saved.id(),
                saved.name() + " 반 정보를 수정했습니다."
        );
        return toClassResponse(saved);
    }

    public StudentResponse.StudentItem createStudent(WorkspaceContext workspaceContext, StudentRequest request) {
        requireAcademyManager(workspaceContext, "학생 관리는 원장 또는 관리자만 할 수 있습니다.");
        StudentPayload payload = parseStudentRequest(request, false);
        validateClass(workspaceContext.academyId(), payload.classId());

        var saved = managementClient.insertStudent(workspaceContext.academyId(), workspaceContext.userId(), payload);
        syncAutomaticScheduleLinks(workspaceContext, saved);
        auditLogWriter.write(
                workspaceContext.academyId(),
                workspaceContext.userId(),
                "student.create",
                "student",
                saved.id(),
                saved.name() + " 학생을 등록했습니다."
        );
        return toStudentResponse(saved);
    }

    public StudentResponse.StudentItem updateStudent(WorkspaceContext workspaceContext, StudentRequest request) {
        requireAcademyManager(workspaceContext, "학생 관리는 원장 또는 관리자만 할 수 있습니다.");
        StudentPayload payload = parseStudentRequest(request, true);
        validateClass(workspaceContext.academyId(), payload.classId());

        var saved = managementClient.updateStudent(workspaceContext.academyId(), workspaceContext.userId(), payload)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "수정할 학생을 찾을 수 없습니다."));
        syncAutomaticScheduleLinks(workspaceContext, saved);
        auditLogWriter.write(
                workspaceContext.academyId(),
                workspaceContext.userId(),
                "student.update",
                "student",
                saved.id(),
                saved.name() + " 학생 정보를 수정했습니다."
                        + (saved.scheduleShareConsentConfirmed() ? " 타 학원 스케줄 공유 동의 확인 포함." : "")
        );
        return toStudentResponse(saved);
    }

    public StudentScheduleResponse.ScheduleItem createSchedule(
            WorkspaceContext workspaceContext,
            StudentScheduleRequest request
    ) {
        StudentSchedulePayload payload = parseScheduleRequest(request, false);
        var relation = validateScheduleRelations(workspaceContext.academyId(), payload);

        if (!workspaceContext.canAccessAssignedClass(relation.classTeacherId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "이 학생의 스케줄을 등록할 권한이 없습니다.");
        }

        if (managementClient.findDuplicateOneOffSchedule(workspaceContext.academyId(), payload).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 같은 날짜와 시간의 보강 일정이 등록되어 있습니다.");
        }

        var saved = managementClient.insertSchedule(workspaceContext.academyId(), payload);
        auditLogWriter.write(
                workspaceContext.academyId(),
                workspaceContext.userId(),
                "schedule.create",
                "student_schedule",
                saved.id(),
                saved.title() + " 스케줄을 등록했습니다."
        );
        return toScheduleResponse(saved);
    }

    public StudentScheduleResponse.ScheduleItem updateSchedule(
            WorkspaceContext workspaceContext,
            StudentScheduleRequest request
    ) {
        StudentSchedulePayload payload = parseScheduleRequest(request, true);
        var relation = validateScheduleRelations(workspaceContext.academyId(), payload);

        if (!workspaceContext.canAccessAssignedClass(relation.classTeacherId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "이 학생의 스케줄을 수정할 권한이 없습니다.");
        }

        var saved = managementClient.updateSchedule(workspaceContext.academyId(), payload)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "수정할 스케줄을 찾을 수 없습니다."));
        boolean isDeleteLikeUpdate = !saved.isActive();
        auditLogWriter.write(
                workspaceContext.academyId(),
                workspaceContext.userId(),
                isDeleteLikeUpdate ? "schedule.delete" : "schedule.update",
                "student_schedule",
                saved.id(),
                isDeleteLikeUpdate
                        ? saved.title() + " 스케줄을 삭제했습니다."
                        : saved.title() + " 스케줄을 수정했습니다."
        );
        return toScheduleResponse(saved);
    }

    private ClassPayload parseClassRequest(ClassRequest request, boolean requireClassId) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문을 읽을 수 없습니다.");
        }

        String classId = optionalText(request.classId());
        if (requireClassId && classId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "수정할 반 ID가 필요합니다.");
        }

        String name = optionalText(request.name());
        if (name == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "반 이름이 필요합니다.");
        }
        if (name.length() > 60) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "반 이름은 60자 이하로 입력해 주세요.");
        }

        return new ClassPayload(
                classId,
                name,
                optionalText(request.subject()),
                optionalText(request.gradeLabel()),
                optionalText(request.teacherId())
        );
    }

    private StudentPayload parseStudentRequest(StudentRequest request, boolean requireStudentId) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문을 읽을 수 없습니다.");
        }

        String studentId = optionalText(request.studentId());
        if (requireStudentId && studentId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "수정할 학생 ID가 필요합니다.");
        }

        String name = optionalText(request.name());
        if (name == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학생 이름이 필요합니다.");
        }
        if (name.length() > 40) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학생 이름은 40자 이하로 입력해 주세요.");
        }

        String parentPhone = normalizePhone(request.parentPhone());
        if (parentPhone == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학부모 연락처가 필요합니다.");
        }

        String studentPhone = normalizeOptionalPhone(request.studentPhone());
        if (!STUDENT_STATUSES.contains(request.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 학생 상태입니다.");
        }

        return new StudentPayload(
                studentId,
                optionalText(request.classId()),
                name,
                optionalText(request.schoolName()),
                optionalText(request.gradeLabel()),
                optionalText(request.parentName()),
                parentPhone,
                studentPhone,
                request.scheduleShareConsentConfirmed() == Boolean.TRUE,
                request.status()
        );
    }

    private StudentSchedulePayload parseScheduleRequest(StudentScheduleRequest request, boolean requireScheduleId) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문을 읽을 수 없습니다.");
        }

        String scheduleId = optionalText(request.scheduleId());
        if (requireScheduleId && scheduleId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "수정할 스케줄 ID가 필요합니다.");
        }

        String studentId = optionalText(request.studentId());
        if (studentId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학생 ID가 필요합니다.");
        }

        if (!SCHEDULE_TYPES.contains(request.scheduleType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 스케줄 유형입니다.");
        }

        String rawScheduleDate = optionalText(request.scheduleDate());
        String scheduleDate = rawScheduleDate == null ? null : parseDate(rawScheduleDate);
        int dayOfWeek = parseDayOfWeek(request.dayOfWeek());
        String startTime = parseTime(request.startTime());
        String endTime = parseTime(request.endTime());

        if (!LocalTime.parse(endTime).isAfter(LocalTime.parse(startTime))) {
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
        String memo = optionalText(request.memo());
        if (subject != null && subject.length() > 40) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "과목은 40자 이하로 입력해 주세요.");
        }
        if (memo != null && memo.length() > 300) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "메모는 300자 이하로 입력해 주세요.");
        }

        return new StudentSchedulePayload(
                scheduleId,
                studentId,
                optionalText(request.classId()),
                optionalText(request.teacherId()),
                request.scheduleType(),
                scheduleDate,
                dayOfWeek,
                startTime,
                endTime,
                subject,
                title,
                memo,
                request.isActive() == null || request.isActive(),
                optionalText(request.sourceFollowupId())
        );
    }

    private void validateTeacher(String academyId, String teacherId) {
        if (teacherId == null) {
            return;
        }

        if (managementClient.findProfile(academyId, teacherId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "담당 선생님을 찾을 수 없습니다.");
        }
    }

    private void validateClass(String academyId, String classId) {
        if (classId == null) {
            return;
        }

        if (managementClient.findClass(academyId, classId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "소속 반을 찾을 수 없습니다.");
        }
    }

    private ScheduleRelation validateScheduleRelations(String academyId, StudentSchedulePayload payload) {
        var student = managementClient.findStudent(academyId, payload.studentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "학생을 찾을 수 없습니다."));

        SupabaseManagementClient.ClassRecord classRecord = null;
        if (payload.classId() != null) {
            classRecord = managementClient.findClass(academyId, payload.classId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "연결할 반을 찾을 수 없습니다."));
        }

        if (payload.teacherId() != null && managementClient.findProfile(academyId, payload.teacherId()).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "담당 선생님을 찾을 수 없습니다.");
        }

        if (payload.sourceFollowupId() != null) {
            var followup = managementClient.findFollowup(academyId, payload.sourceFollowupId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "연결할 연락 기록을 찾을 수 없습니다."));
            if (!Objects.equals(followup.studentId(), payload.studentId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "연락 기록과 학생 정보가 일치하지 않습니다.");
            }
        }

        return new ScheduleRelation(student, classRecord == null ? null : classRecord.teacherId());
    }

    private void syncAutomaticScheduleLinks(WorkspaceContext workspaceContext, SupabaseManagementClient.StudentRecord student) {
        List<SupabaseManagementClient.ScheduleLinkRecord> links = new java.util.ArrayList<>();
        links.addAll(managementClient.findActiveScheduleLinks(student.academyId(), student.id(), true));
        links.addAll(managementClient.findActiveScheduleLinks(student.academyId(), student.id(), false));

        if (!student.scheduleShareConsentConfirmed()) {
            managementClient.revokeScheduleLinks(links.stream().map(SupabaseManagementClient.ScheduleLinkRecord::id).toList(), workspaceContext.userId());
            return;
        }

        List<StudentRef> linkedRefs = links.stream().map((link) -> remoteStudentRef(link, student)).toList();
        List<SupabaseManagementClient.StudentRecord> remoteStudents = managementClient.findStudentsByIds(
                linkedRefs.stream().map(StudentRef::studentId).distinct().toList()
        );
        Set<String> validRemoteKeys = new HashSet<>();
        for (SupabaseManagementClient.StudentRecord remoteStudent : remoteStudents) {
            if (isAutomaticShareMatch(student, remoteStudent)) {
                validRemoteKeys.add(remoteStudent.academyId() + ":" + remoteStudent.id());
            }
        }
        List<String> invalidLinkIds = links.stream()
                .filter((link) -> {
                    StudentRef ref = remoteStudentRef(link, student);
                    return !validRemoteKeys.contains(ref.academyId() + ":" + ref.studentId());
                })
                .map(SupabaseManagementClient.ScheduleLinkRecord::id)
                .toList();
        managementClient.revokeScheduleLinks(invalidLinkIds, workspaceContext.userId());

        for (SupabaseManagementClient.StudentRecord candidate : managementClient.findShareCandidates(student.academyId())) {
            if (!isAutomaticShareMatch(student, candidate)) {
                continue;
            }
            if (managementClient.hasScheduleLink(student.id(), candidate.id())
                    || managementClient.hasScheduleLink(candidate.id(), student.id())) {
                continue;
            }
            managementClient.insertScheduleLink(student.academyId(), student.id(), candidate, workspaceContext.userId());
        }
    }

    private boolean isAutomaticShareMatch(
            SupabaseManagementClient.StudentRecord source,
            SupabaseManagementClient.StudentRecord target
    ) {
        if (!source.scheduleShareConsentConfirmed() || !target.scheduleShareConsentConfirmed()) {
            return false;
        }
        if (Objects.equals(source.academyId(), target.academyId())) {
            return false;
        }
        if (!normalizeIdentity(source.name()).equals(normalizeIdentity(target.name()))
                || !normalizeIdentity(source.schoolName()).equals(normalizeIdentity(target.schoolName()))
                || !normalizeIdentity(source.gradeLabel()).equals(normalizeIdentity(target.gradeLabel()))) {
            return false;
        }

        List<String> sourcePhones = matchPhones(source);
        List<String> targetPhones = matchPhones(target);
        return sourcePhones.stream().anyMatch(targetPhones::contains);
    }

    private List<String> matchPhones(SupabaseManagementClient.StudentRecord student) {
        return java.util.stream.Stream.of(student.parentPhone(), student.studentPhone())
                .map(this::normalizePhone)
                .filter(Objects::nonNull)
                .toList();
    }

    private StudentRef remoteStudentRef(
            SupabaseManagementClient.ScheduleLinkRecord link,
            SupabaseManagementClient.StudentRecord student
    ) {
        if (Objects.equals(link.sourceAcademyId(), student.academyId())
                && Objects.equals(link.sourceStudentId(), student.id())) {
            return new StudentRef(link.targetAcademyId(), link.targetStudentId());
        }

        return new StudentRef(link.sourceAcademyId(), link.sourceStudentId());
    }

    private void requireAcademyManager(WorkspaceContext workspaceContext, String message) {
        if (!workspaceContext.canManageAcademy()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, message);
        }
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

    private String normalizeOptionalPhone(String value) {
        String text = optionalText(value);
        if (text == null) {
            return null;
        }

        String phone = normalizePhone(text);
        if (phone == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학생 연락처 형식이 올바르지 않습니다.");
        }
        return phone;
    }

    private String parseDate(String value) {
        if (!DATE_PATTERN.matcher(value).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "스케줄 날짜는 YYYY-MM-DD 형식으로 입력해 주세요.");
        }

        try {
            LocalDate.parse(value);
            return value;
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "스케줄 날짜는 YYYY-MM-DD 형식으로 입력해 주세요.");
        }
    }

    private int parseDayOfWeek(Object value) {
        int numberValue;
        if (value instanceof Number number) {
            numberValue = number.intValue();
        } else if (value instanceof String text && StringUtils.hasText(text)) {
            try {
                numberValue = Integer.parseInt(text);
            } catch (NumberFormatException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요일은 0부터 6 사이로 입력해 주세요.");
            }
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요일은 0부터 6 사이로 입력해 주세요.");
        }

        if (numberValue < 0 || numberValue > 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요일은 0부터 6 사이로 입력해 주세요.");
        }
        return numberValue;
    }

    private String parseTime(String value) {
        String text = optionalText(value);
        if (text == null || !TIME_PATTERN.matcher(text).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "시작 시간과 종료 시간을 HH:MM 형식으로 입력해 주세요.");
        }
        return text;
    }

    private String normalizeIdentity(String value) {
        return value == null ? "" : value.replaceAll("\\s+", "").trim().toLowerCase();
    }

    private ClassResponse.ClassItem toClassResponse(SupabaseManagementClient.ClassRecord classRecord) {
        return new ClassResponse.ClassItem(
                classRecord.id(),
                classRecord.name(),
                classRecord.subject(),
                classRecord.gradeLabel(),
                classRecord.teacherId()
        );
    }

    private StudentResponse.StudentItem toStudentResponse(SupabaseManagementClient.StudentRecord student) {
        return new StudentResponse.StudentItem(
                student.id(),
                student.classId(),
                student.name(),
                student.schoolName(),
                student.gradeLabel(),
                student.parentName(),
                student.parentPhone(),
                student.studentPhone(),
                student.scheduleShareConsentConfirmed(),
                student.status()
        );
    }

    private StudentScheduleResponse.ScheduleItem toScheduleResponse(SupabaseManagementClient.ScheduleRecord schedule) {
        return new StudentScheduleResponse.ScheduleItem(
                schedule.id(),
                schedule.studentId(),
                schedule.classId(),
                schedule.teacherId(),
                schedule.scheduleType(),
                schedule.scheduleDate(),
                schedule.dayOfWeek(),
                minuteTime(schedule.startTime()),
                minuteTime(schedule.endTime()),
                schedule.subject(),
                schedule.title(),
                schedule.memo(),
                schedule.isActive(),
                schedule.sourceFollowupId()
        );
    }

    private String minuteTime(String value) {
        return value == null || value.length() < 5 ? value : value.substring(0, 5);
    }

    private record ScheduleRelation(SupabaseManagementClient.StudentRecord student, String classTeacherId) {
    }

    private record StudentRef(String academyId, String studentId) {
    }
}
