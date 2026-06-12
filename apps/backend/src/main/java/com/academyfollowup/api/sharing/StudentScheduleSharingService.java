package com.academyfollowup.api.sharing;

import com.academyfollowup.api.global.security.WorkspaceContext;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StudentScheduleSharingService {

    private static final int TOKEN_LIFETIME_DAYS = 14;
    private static final String STUDENT_IDENTITY_MISMATCH_MESSAGE =
            "공유 코드의 학생 정보와 현재 선택한 학생 정보가 다릅니다. 이름, 학교, 학년을 확인해 주세요.";
    private static final String STUDENT_WORKSPACE_MISMATCH_MESSAGE =
            "현재 로그인한 학원과 선택한 학생 정보가 맞지 않습니다. 다른 학원 계정으로 로그인했거나 화면이 오래된 상태일 수 있습니다. 새로고침 후 다시 확인해 주세요.";
    private static final String CONSENT_REQUIRED_MESSAGE = "보호자 동의 확인 후 공유 코드를 만들 수 있습니다.";

    private final SecureRandom secureRandom = new SecureRandom();
    private final SupabaseScheduleSharingClient sharingClient;

    public StudentScheduleSharingService(SupabaseScheduleSharingClient sharingClient) {
        this.sharingClient = sharingClient;
    }

    public StudentScheduleSharingResponse getLinks(WorkspaceContext workspaceContext, String studentId) {
        String normalizedStudentId = optionalText(studentId);
        if (normalizedStudentId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학생 ID가 필요합니다.");
        }
        assertStudentAccess(workspaceContext, normalizedStudentId, "이 학생의 공유 스케줄을 볼 권한이 없습니다.");
        return new StudentScheduleSharingResponse(
                workspaceContext.canManageAcademy(),
                buildSharedLinks(workspaceContext, normalizedStudentId),
                null,
                null,
                null
        );
    }

    public StudentScheduleSharingResponse handle(
            WorkspaceContext workspaceContext,
            StudentScheduleSharingRequest request
    ) {
        if (!workspaceContext.canManageAcademy()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "원장 또는 관리자만 스케줄 공유를 관리할 수 있습니다.");
        }
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문을 확인해 주세요.");
        }
        String action = optionalText(request.action());
        String studentId = optionalText(request.studentId());
        if (!Set.of("create_token", "connect", "revoke").contains(action)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 공유 요청입니다.");
        }
        if (studentId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학생 ID가 필요합니다.");
        }
        assertStudentAccess(workspaceContext, studentId, "이 학생의 스케줄 공유를 관리할 권한이 없습니다.");
        if (Objects.equals(action, "create_token")) {
            return createShareToken(workspaceContext, studentId);
        }
        if (Objects.equals(action, "connect")) {
            String code = normalizeShareCode(request.code());
            if (code == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "공유 코드가 필요합니다.");
            }
            return connectWithShareCode(workspaceContext, studentId, code);
        }
        String linkId = optionalText(request.linkId());
        if (linkId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "해제할 공유 연결 ID가 필요합니다.");
        }
        return revokeShareLink(workspaceContext, studentId, linkId);
    }

    private StudentScheduleSharingResponse createShareToken(WorkspaceContext workspaceContext, String studentId) {
        verifyConsent(workspaceContext.academyId(), studentId);
        String code = createShareCode();
        String expiresAt = Instant.now().plus(TOKEN_LIFETIME_DAYS, ChronoUnit.DAYS).toString();
        sharingClient.insertShareToken(
                workspaceContext.academyId(),
                studentId,
                hashShareCode(code),
                expiresAt,
                workspaceContext.userId()
        );
        return new StudentScheduleSharingResponse(
                null,
                null,
                code,
                expiresAt,
                "공유 코드를 만들었습니다. 보호자 동의가 확인된 학원에만 전달해 주세요."
        );
    }

    private StudentScheduleSharingResponse connectWithShareCode(
            WorkspaceContext workspaceContext,
            String studentId,
            String code
    ) {
        var token = sharingClient.findTokenByHash(hashShareCode(code))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "유효한 공유 코드를 찾을 수 없습니다."));
        if (!Objects.equals(token.status(), "active")) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "유효한 공유 코드를 찾을 수 없습니다.");
        }
        if (Instant.parse(token.expiresAt()).isBefore(Instant.now())) {
            sharingClient.expireToken(token.id());
            throw new ResponseStatusException(HttpStatus.GONE, "만료된 공유 코드입니다.");
        }
        if (Objects.equals(token.academyId(), workspaceContext.academyId()) || Objects.equals(token.studentId(), studentId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "같은 학원 또는 같은 학생에는 공유 코드를 연결할 수 없습니다.");
        }
        verifySameStudentIdentity(
                token.academyId(),
                token.studentId(),
                workspaceContext.academyId(),
                studentId
        );
        sharingClient.insertLink(
                token.academyId(),
                token.studentId(),
                workspaceContext.academyId(),
                studentId,
                workspaceContext.userId()
        );
        sharingClient.markTokenUsed(token.id());
        return new StudentScheduleSharingResponse(null, null, null, null, "학생 스케줄 공유를 연결했습니다.");
    }

    private StudentScheduleSharingResponse revokeShareLink(
            WorkspaceContext workspaceContext,
            String studentId,
            String linkId
    ) {
        var link = sharingClient.findActiveLink(linkId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "연결된 공유 스케줄을 찾을 수 없습니다."));
        if (!isOwnSideLink(link, workspaceContext.academyId(), studentId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "연결된 공유 스케줄을 찾을 수 없습니다.");
        }
        sharingClient.revokeLink(link.id(), workspaceContext.userId());
        return new StudentScheduleSharingResponse(null, null, null, null, "스케줄 공유 연결을 해제했습니다.");
    }

    private List<StudentScheduleSharingResponse.LinkItem> buildSharedLinks(
            WorkspaceContext workspaceContext,
            String studentId
    ) {
        List<SupabaseScheduleSharingClient.ShareLinkRecord> links = new ArrayList<>();
        links.addAll(sharingClient.findLinks(workspaceContext.academyId(), studentId, true));
        links.addAll(sharingClient.findLinks(workspaceContext.academyId(), studentId, false));
        if (links.isEmpty()) {
            return List.of();
        }
        if (!hasConsent(workspaceContext.academyId(), studentId)) {
            return List.of();
        }
        List<StudentRef> remoteRefs = links.stream()
                .map((link) -> remoteStudentRef(link, workspaceContext.academyId(), studentId))
                .toList();
        List<String> remoteStudentIds = remoteRefs.stream().map(StudentRef::studentId).distinct().toList();
        Set<String> consentedRemoteStudents = sharingClient.findStudentConsents(remoteStudentIds)
                .stream()
                .filter(SupabaseScheduleSharingClient.StudentConsentRecord::scheduleShareConsentConfirmed)
                .map((student) -> student.academyId() + ":" + student.id())
                .collect(Collectors.toSet());
        List<SupabaseScheduleSharingClient.SharedScheduleRecord> schedules =
                sharingClient.findSchedules(remoteStudentIds);
        List<StudentScheduleSharingResponse.LinkItem> response = new ArrayList<>();
        for (int index = 0; index < links.size(); index += 1) {
            var link = links.get(index);
            StudentRef remote = remoteStudentRef(link, workspaceContext.academyId(), studentId);
            String academyName = "연결 학원 " + (index + 1);
            List<StudentScheduleSharingResponse.ScheduleItem> scheduleItems = schedules.stream()
                    .filter((schedule) -> Objects.equals(schedule.studentId(), remote.studentId())
                            && Objects.equals(schedule.academyId(), remote.academyId()))
                    .filter((schedule) -> consentedRemoteStudents.contains(schedule.academyId() + ":" + schedule.studentId()))
                    .map((schedule) -> new StudentScheduleSharingResponse.ScheduleItem(
                            schedule.id(),
                            academyName,
                            schedule.scheduleType(),
                            schedule.scheduleDate(),
                            schedule.dayOfWeek(),
                            trimTime(schedule.startTime()),
                            trimTime(schedule.endTime()),
                            schedule.subject(),
                            schedule.title()
                    ))
                    .toList();
            response.add(new StudentScheduleSharingResponse.LinkItem(link.id(), academyName, link.createdAt(), scheduleItems));
        }
        return response;
    }

    private SupabaseScheduleSharingClient.StudentRecord assertStudentAccess(
            WorkspaceContext workspaceContext,
            String studentId,
            String permissionError
    ) {
        var student = sharingClient.findStudent(workspaceContext.academyId(), studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, STUDENT_WORKSPACE_MISMATCH_MESSAGE));
        if (workspaceContext.canManageAcademy()) {
            return student;
        }
        if (student.classId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, permissionError);
        }
        var classItem = sharingClient.findClass(workspaceContext.academyId(), student.classId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, permissionError));
        if (!workspaceContext.canAccessAssignedClass(classItem.teacherId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, permissionError);
        }
        return student;
    }

    private void verifyConsent(String academyId, String studentId) {
        if (!hasConsent(academyId, studentId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, CONSENT_REQUIRED_MESSAGE);
        }
    }

    private boolean hasConsent(String academyId, String studentId) {
        var student = sharingClient.findStudent(academyId, studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "학생 정보를 찾을 수 없습니다."));
        return student.scheduleShareConsentConfirmed();
    }

    private void verifySameStudentIdentity(
            String sourceAcademyId,
            String sourceStudentId,
            String targetAcademyId,
            String targetStudentId
    ) {
        var source = sharingClient.findStudent(sourceAcademyId, sourceStudentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "학생 정보를 찾을 수 없습니다."));
        var target = sharingClient.findStudent(targetAcademyId, targetStudentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "학생 정보를 찾을 수 없습니다."));
        if (!isSameStudentIdentity(source, target)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, STUDENT_IDENTITY_MISMATCH_MESSAGE);
        }
        if (!source.scheduleShareConsentConfirmed() || !target.scheduleShareConsentConfirmed()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, CONSENT_REQUIRED_MESSAGE);
        }
    }

    private boolean isSameStudentIdentity(
            SupabaseScheduleSharingClient.StudentRecord source,
            SupabaseScheduleSharingClient.StudentRecord target
    ) {
        String sourceName = normalizeIdentity(source.name());
        String sourceSchool = normalizeIdentity(source.schoolName());
        String sourceGrade = normalizeIdentity(source.gradeLabel());
        String targetName = normalizeIdentity(target.name());
        String targetSchool = normalizeIdentity(target.schoolName());
        String targetGrade = normalizeIdentity(target.gradeLabel());
        return StringUtils.hasText(sourceName)
                && StringUtils.hasText(sourceSchool)
                && StringUtils.hasText(sourceGrade)
                && sourceName.equals(targetName)
                && sourceSchool.equals(targetSchool)
                && sourceGrade.equals(targetGrade);
    }

    private StudentRef remoteStudentRef(
            SupabaseScheduleSharingClient.ShareLinkRecord link,
            String academyId,
            String studentId
    ) {
        if (Objects.equals(link.sourceAcademyId(), academyId) && Objects.equals(link.sourceStudentId(), studentId)) {
            return new StudentRef(link.targetAcademyId(), link.targetStudentId());
        }
        return new StudentRef(link.sourceAcademyId(), link.sourceStudentId());
    }

    private boolean isOwnSideLink(
            SupabaseScheduleSharingClient.ShareLinkRecord link,
            String academyId,
            String studentId
    ) {
        return (Objects.equals(link.sourceAcademyId(), academyId) && Objects.equals(link.sourceStudentId(), studentId))
                || (Objects.equals(link.targetAcademyId(), academyId) && Objects.equals(link.targetStudentId(), studentId));
    }

    private String createShareCode() {
        byte[] bytes = new byte[9];
        secureRandom.nextBytes(bytes);
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes).toUpperCase();
    }

    private String normalizeShareCode(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String normalized = value.replaceAll("[^a-zA-Z0-9_-]", "").toUpperCase();
        return StringUtils.hasText(normalized) ? normalized : null;
    }

    private String hashShareCode(String code) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(normalizeShareCode(code).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 digest is not available", exception);
        }
    }

    private String normalizeIdentity(String value) {
        return (value == null ? "" : value).replaceAll("\\s+", "").trim().toLowerCase();
    }

    private String optionalText(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private String trimTime(String value) {
        return value == null || value.length() < 5 ? value : value.substring(0, 5);
    }

    private record StudentRef(String academyId, String studentId) {
    }
}
