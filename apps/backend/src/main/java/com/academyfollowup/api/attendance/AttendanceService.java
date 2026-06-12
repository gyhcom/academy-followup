package com.academyfollowup.api.attendance;

import com.academyfollowup.api.global.security.WorkspaceContext;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AttendanceService {

    private static final int NOTE_LIMIT = 300;
    private static final Pattern DATE_PATTERN = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");
    private static final Pattern TIME_PATTERN = Pattern.compile("^\\d{2}:\\d{2}$");

    private final SupabaseAttendanceClient attendanceClient;
    private final Clock clock;

    public AttendanceService(SupabaseAttendanceClient attendanceClient, Clock clock) {
        this.attendanceClient = attendanceClient;
        this.clock = clock;
    }

    public List<AttendanceResponse.AttendanceRecordItem> findRecords(
            WorkspaceContext workspaceContext,
            String date
    ) {
        String attendanceDate = parseQueryDate(date);

        List<SupabaseAttendanceClient.AttendanceRecord> records;
        if (workspaceContext.canManageAcademy()) {
            records = attendanceClient.findRecords(workspaceContext.academyId(), attendanceDate);
        } else {
            var classIds = attendanceClient.findAssignedClassIds(
                            workspaceContext.academyId(),
                            workspaceContext.userId()
                    ).stream()
                    .map(SupabaseAttendanceClient.ClassIdRecord::id)
                    .toList();
            records = attendanceClient.findRecordsForClasses(workspaceContext.academyId(), attendanceDate, classIds);
        }

        return records.stream().map(this::toResponse).toList();
    }

    public AttendanceResponse.AttendanceRecordItem save(
            WorkspaceContext workspaceContext,
            AttendanceRequest request
    ) {
        AttendancePayload payload = parseRequest(request);
        var classRecord = attendanceClient.findClass(workspaceContext.academyId(), payload.classId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "반을 찾을 수 없습니다."));
        var student = attendanceClient.findStudent(workspaceContext.academyId(), payload.studentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "학생을 찾을 수 없습니다."));

        if (!Objects.equals(student.classId(), classRecord.id())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학생이 선택한 반에 속해 있지 않습니다.");
        }

        if (!"active".equals(student.status())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "비활성 학생은 출석부를 수정할 수 없습니다.");
        }

        if (!workspaceContext.canAccessAssignedClass(classRecord.teacherId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "이 반의 출석부를 수정할 권한이 없습니다.");
        }

        String checkedAt = payload.status() == AttendanceStatus.PENDING ? null : Instant.now(clock).toString();
        String arrivedAt = payload.status().hasArrived() ? checkedAt : null;

        return attendanceClient.upsertAttendance(
                        workspaceContext.academyId(),
                        workspaceContext.userId(),
                        payload,
                        checkedAt,
                        arrivedAt
                )
                .map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "출석 상태 저장 중 오류가 발생했습니다."
                ));
    }

    private AttendancePayload parseRequest(AttendanceRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문을 읽을 수 없습니다.");
        }

        if (!StringUtils.hasText(request.studentId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학생 ID가 필요합니다.");
        }

        if (!StringUtils.hasText(request.classId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "반 ID가 필요합니다.");
        }

        String attendanceDate = parseAttendanceDate(request.attendanceDate());
        String scheduledStartTime = parseTime(request.scheduledStartTime());
        String scheduledEndTime = parseTime(request.scheduledEndTime());

        if (!LocalTime.parse(scheduledEndTime).isAfter(LocalTime.parse(scheduledStartTime))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "종료 시간은 시작 시간보다 늦어야 합니다.");
        }

        AttendanceStatus status = AttendanceStatus.from(request.status());
        if (status == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 출석 상태입니다.");
        }

        String note = normalizeOptionalText(request.note());
        if (note != null && note.length() > NOTE_LIMIT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "메모는 300자 이하로 입력해 주세요.");
        }

        return new AttendancePayload(
                request.studentId().trim(),
                request.classId().trim(),
                attendanceDate,
                scheduledStartTime,
                scheduledEndTime,
                status,
                note
        );
    }

    private String parseQueryDate(String value) {
        if (!isValidDate(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "조회 날짜가 필요합니다.");
        }

        return value.trim();
    }

    private String parseAttendanceDate(String value) {
        if (!isValidDate(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "출석 날짜는 YYYY-MM-DD 형식으로 입력해 주세요.");
        }

        return value.trim();
    }

    private boolean isValidDate(String value) {
        if (!StringUtils.hasText(value) || !DATE_PATTERN.matcher(value).matches()) {
            return false;
        }

        try {
            LocalDate.parse(value);
            return true;
        } catch (DateTimeParseException exception) {
            return false;
        }
    }

    private String parseTime(String value) {
        if (!StringUtils.hasText(value) || !TIME_PATTERN.matcher(value).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "수업 시간은 HH:MM 형식으로 입력해 주세요.");
        }

        try {
            LocalTime.parse(value);
            return value.trim();
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "수업 시간은 HH:MM 형식으로 입력해 주세요.");
        }
    }

    private String normalizeOptionalText(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        return value.trim();
    }

    private AttendanceResponse.AttendanceRecordItem toResponse(
            SupabaseAttendanceClient.AttendanceRecord record
    ) {
        SupabaseAttendanceClient.FollowupRecord followup = record.followups() == null || record.followups().isEmpty()
                ? null
                : record.followups().getFirst();

        return new AttendanceResponse.AttendanceRecordItem(
                record.id(),
                record.studentId(),
                record.classId(),
                record.teacherId(),
                record.attendanceDate(),
                toMinuteTime(record.scheduledStartTime()),
                toMinuteTime(record.scheduledEndTime()),
                record.status(),
                record.checkedAt(),
                record.arrivedAt(),
                record.note(),
                record.followupId(),
                followup == null ? null : followup.status(),
                followup == null ? null : followup.sentAt()
        );
    }

    private String toMinuteTime(String value) {
        if (value == null || value.length() < 5) {
            return value;
        }

        return value.substring(0, 5);
    }
}
