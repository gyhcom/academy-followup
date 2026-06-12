package com.academyfollowup.api.followup;

import com.academyfollowup.api.global.security.WorkspaceContext;
import com.academyfollowup.api.message.FollowupReason;
import com.academyfollowup.api.message.MessageLengthMetricsCalculator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class FollowupService {

    private static final int LMS_BYTE_LIMIT = 2000;

    private final SupabaseFollowupClient followupClient;
    private final MessageLengthMetricsCalculator metricsCalculator;

    public FollowupService(
            SupabaseFollowupClient followupClient,
            MessageLengthMetricsCalculator metricsCalculator
    ) {
        this.followupClient = followupClient;
        this.metricsCalculator = metricsCalculator;
    }

    public List<FollowupHistoryResponse.FollowupHistoryItem> findHistory(
            WorkspaceContext workspaceContext,
            String studentId
    ) {
        if (!StringUtils.hasText(studentId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학생 ID가 필요합니다.");
        }

        var access = resolveStudentAccess(
                workspaceContext,
                studentId,
                false,
                null,
                "이 학생의 연락 기록을 볼 권한이 없습니다."
        );

        return followupClient.findHistory(workspaceContext.academyId(), access.student().id()).stream()
                .map(followup -> new FollowupHistoryResponse.FollowupHistoryItem(
                        followup.id(),
                        followup.reason(),
                        followup.messageBody(),
                        followup.recipientType(),
                        followup.status(),
                        followup.sentAt(),
                        followup.createdAt()
                ))
                .toList();
    }

    public CreateFollowupResponse.FollowupCreated create(
            WorkspaceContext workspaceContext,
            CreateFollowupRequest request
    ) {
        var parsed = parseRequest(request);
        var access = resolveStudentAccess(
                workspaceContext,
                parsed.studentId(),
                true,
                "비활성 학생은 연락 기록을 만들 수 없습니다.",
                "이 학생의 연락 기록을 만들 권한이 없습니다."
        );
        var attendance = resolveAttendanceRecord(
                workspaceContext.academyId(),
                parsed.attendanceRecordId(),
                access.student()
        );
        var followup = followupClient.insertFollowup(
                workspaceContext.academyId(),
                access.student().id(),
                access.student().classId(),
                workspaceContext.userId(),
                parsed.reason().value(),
                parsed.messageBody(),
                parsed.recipientType().value()
        ).orElseThrow(() -> new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "연락 기록 저장 중 오류가 발생했습니다."
        ));

        if (attendance != null) {
            followupClient.updateAttendanceFollowup(
                    workspaceContext.academyId(),
                    attendance.id(),
                    followup.id()
            );
        }

        return new CreateFollowupResponse.FollowupCreated(
                followup.id(),
                followup.status(),
                followup.createdAt(),
                attendance == null ? null : attendance.id()
        );
    }

    private ParsedCreateFollowupRequest parseRequest(CreateFollowupRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문을 읽을 수 없습니다.");
        }

        if (!StringUtils.hasText(request.studentId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학생 ID가 필요합니다.");
        }

        FollowupReason reason = FollowupReason.from(request.reason());
        if (reason == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 연락 사유입니다.");
        }

        if (!StringUtils.hasText(request.messageBody())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "저장할 문자 본문이 필요합니다.");
        }

        String messageBody = normalizeMessageForSending(request.messageBody());
        var metrics = metricsCalculator.calculate(messageBody);
        if (metrics.isOverLimit()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "문자 본문은 " + LMS_BYTE_LIMIT + "byte 이하로 입력해 주세요. 현재 " + metrics.byteCount() + "byte입니다."
            );
        }

        String recipientTypeValue = StringUtils.hasText(request.recipientType())
                ? request.recipientType()
                : "parent";
        FollowupRecipientType recipientType = FollowupRecipientType.from(recipientTypeValue);
        if (recipientType == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 문자 수신자입니다.");
        }

        String attendanceRecordId = null;
        if (request.attendanceRecordId() != null) {
            if (!StringUtils.hasText(request.attendanceRecordId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "출석 기록 ID 형식이 올바르지 않습니다.");
            }
            attendanceRecordId = request.attendanceRecordId().trim();
        }

        return new ParsedCreateFollowupRequest(
                request.studentId(),
                reason,
                messageBody,
                recipientType,
                attendanceRecordId
        );
    }

    private StudentAccess resolveStudentAccess(
            WorkspaceContext workspaceContext,
            String studentId,
            boolean requireActiveStudent,
            String inactiveError,
            String permissionError
    ) {
        var student = followupClient.findStudent(workspaceContext.academyId(), studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "선택한 학생을 찾을 수 없습니다."));

        if (requireActiveStudent && !"active".equals(student.status())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    inactiveError == null ? "비활성 학생은 처리할 수 없습니다." : inactiveError
            );
        }

        SupabaseFollowupClient.ClassRecord classRecord = null;
        if (StringUtils.hasText(student.classId())) {
            classRecord = followupClient.findClass(workspaceContext.academyId(), student.classId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "반 정보를 확인하지 못했습니다."));
        }

        if (!workspaceContext.canAccessAssignedClass(classRecord == null ? null : classRecord.teacherId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, permissionError);
        }

        return new StudentAccess(student, classRecord);
    }

    private SupabaseFollowupClient.AttendanceRecord resolveAttendanceRecord(
            String academyId,
            String attendanceRecordId,
            SupabaseFollowupClient.StudentRecord student
    ) {
        if (attendanceRecordId == null) {
            return null;
        }

        var attendanceRecord = followupClient.findAttendanceRecord(academyId, attendanceRecordId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "연결할 출석 기록을 찾을 수 없습니다."));

        if (!"absent".equals(attendanceRecord.status()) && !"late".equals(attendanceRecord.status())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "결석 또는 지각 출석 기록만 문자 연락 기록과 연결할 수 있습니다."
            );
        }

        if (!attendanceRecord.studentId().equals(student.id())
                || !java.util.Objects.equals(attendanceRecord.classId(), student.classId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "출석 기록과 팔로업 대상 학생 정보가 일치하지 않습니다."
            );
        }

        return attendanceRecord;
    }

    private String normalizeMessageForSending(String message) {
        return message.replace("\r\n", "\n").replace("\r", "\n").trim();
    }

    private record StudentAccess(
            SupabaseFollowupClient.StudentRecord student,
            SupabaseFollowupClient.ClassRecord classRecord
    ) {
    }

    private record ParsedCreateFollowupRequest(
            String studentId,
            FollowupReason reason,
            String messageBody,
            FollowupRecipientType recipientType,
            String attendanceRecordId
    ) {
    }
}
