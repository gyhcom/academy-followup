package com.academyfollowup.api.member;

import com.academyfollowup.api.global.security.WorkspaceContext;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MemberService {

    private static final Set<String> MEMBER_ROLES = Set.of("owner", "manager", "teacher", "assistant");
    private static final Set<String> MEMBER_STATUSES = Set.of("active", "inactive");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final SupabaseMemberClient memberClient;
    private final SupabaseAuthAdminClient authAdminClient;

    public MemberService(SupabaseMemberClient memberClient, SupabaseAuthAdminClient authAdminClient) {
        this.memberClient = memberClient;
        this.authAdminClient = authAdminClient;
    }

    public List<MemberResponse.MemberItem> findMembers(WorkspaceContext workspaceContext) {
        requireMemberManager(workspaceContext);

        return memberClient.findMembers(workspaceContext.academyId()).stream()
                .map(this::toResponse)
                .toList();
    }

    public MemberResponse.MemberItem createMember(WorkspaceContext workspaceContext, MemberRequest request) {
        requireMemberManager(workspaceContext);
        MemberPayload payload = parseRequest(request, "create");
        AuthUserRecord authUser = authAdminClient.createUser(workspaceContext.academyId(), payload);

        try {
            return toResponse(memberClient.insertProfile(workspaceContext.academyId(), authUser, payload));
        } catch (RuntimeException exception) {
            authAdminClient.deleteUser(authUser.id());
            throw exception;
        }
    }

    public MemberResponse.MemberItem updateMember(WorkspaceContext workspaceContext, MemberRequest request) {
        requireMemberManager(workspaceContext);
        MemberPayload payload = parseRequest(request, "edit");

        if (payload.memberId().equals(workspaceContext.userId())
                && (!"active".equals(payload.status())
                || (!"owner".equals(payload.role()) && !"manager".equals(payload.role())))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "현재 로그인한 관리자 계정은 비활성화하거나 권한을 낮출 수 없습니다."
            );
        }

        if (memberClient.findMember(workspaceContext.academyId(), payload.memberId()).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "수정할 구성원을 찾을 수 없습니다.");
        }

        authAdminClient.updateUser(workspaceContext.academyId(), payload);
        return memberClient.updateProfile(workspaceContext.academyId(), payload)
                .map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "수정할 구성원을 찾을 수 없습니다."));
    }

    private void requireMemberManager(WorkspaceContext workspaceContext) {
        if (!workspaceContext.canManageAcademy()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "구성원 관리는 원장 또는 관리자만 할 수 있습니다.");
        }
    }

    private MemberPayload parseRequest(MemberRequest request, String mode) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문을 읽을 수 없습니다.");
        }

        String memberId = optionalText(request.memberId());
        if ("edit".equals(mode) && memberId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "수정할 구성원 ID가 필요합니다.");
        }

        String name = optionalText(request.name());
        if (name == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이름이 필요합니다.");
        }
        if (name.length() > 40) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이름은 40자 이하로 입력해 주세요.");
        }

        String email = optionalText(request.email());
        if (email != null) {
            email = email.toLowerCase();
        } else if ("create".equals(mode)) {
            email = createInternalMemberEmail();
        }
        if (email == null || !EMAIL_PATTERN.matcher(email).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "구성원 로그인 ID를 생성하지 못했습니다.");
        }

        String phone = optionalPhone(request.phone());
        String role = optionalText(request.role());
        if (role == null) {
            role = "teacher";
        }
        if (!MEMBER_ROLES.contains(role)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "구성원 역할을 확인해 주세요.");
        }

        String status = optionalText(request.status());
        if (status == null) {
            status = "active";
        }
        if (!MEMBER_STATUSES.contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "구성원 상태를 확인해 주세요.");
        }

        String password = optionalText(request.password());
        if ("create".equals(mode) && (password == null || password.length() < 8)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "임시 비밀번호는 8자 이상으로 입력해 주세요.");
        }

        return new MemberPayload(
                memberId,
                name,
                email,
                phone,
                role,
                status,
                password
        );
    }

    private String createInternalMemberEmail() {
        return "member-" + UUID.randomUUID() + "@academy-followup.internal.test";
    }

    private String optionalText(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        return value.trim();
    }

    private String optionalPhone(String value) {
        String text = optionalText(value);
        if (text == null) {
            return null;
        }

        String digits = text.replaceAll("\\D", "");
        return digits.length() >= 10 && digits.length() <= 11 ? digits : null;
    }

    private MemberResponse.MemberItem toResponse(SupabaseMemberClient.MemberRecord member) {
        return new MemberResponse.MemberItem(
                member.id(),
                member.name(),
                member.email(),
                member.phone(),
                member.role(),
                member.status()
        );
    }
}
