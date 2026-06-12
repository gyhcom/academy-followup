package com.academyfollowup.api.platform;

import com.academyfollowup.api.member.AuthUserRecord;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PlatformAcademyService {

    private static final Set<String> PLANS = Set.of("free", "starter", "standard", "pro", "pilot");
    private static final Set<String> STATUSES = Set.of("active", "trialing", "paused", "cancelled");

    private final SupabasePlatformAcademyClient academyClient;
    private final PlatformAuthAdminClient authAdminClient;

    public PlatformAcademyService(
            SupabasePlatformAcademyClient academyClient,
            PlatformAuthAdminClient authAdminClient
    ) {
        this.academyClient = academyClient;
        this.authAdminClient = authAdminClient;
    }

    public PlatformAcademyResponse findAcademies() {
        return PlatformAcademyResponse.academies(
                academyClient.findAcademies().stream().map(this::toItem).toList()
        );
    }

    public PlatformAcademyResponse handle(PlatformAcademyRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문을 읽을 수 없습니다.");
        }

        String action = optionalText(request == null ? null : request.action());
        if (!StringUtils.hasText(action)) {
            action = "create";
        }

        if ("create".equals(action)) {
            return createAcademy(request);
        }

        if ("update_status".equals(action)) {
            return updateAcademyStatus(request);
        }

        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 요청입니다.");
    }

    private PlatformAcademyResponse createAcademy(PlatformAcademyRequest request) {
        String name = optionalText(request.name());
        String slug = normalizeSlug(optionalText(request.slug()));
        String category = optionalText(request.category());
        String rawPlan = optionalText(request.plan());
        String rawStatus = optionalText(request.status());
        String plan = parse(rawPlan, PLANS);
        String status = parse(rawStatus, STATUSES);
        String ownerEmail = optionalText(request.ownerEmail());
        String ownerName = optionalText(request.ownerName());
        String ownerPassword = optionalText(request.ownerPassword());

        if (!StringUtils.hasText(rawStatus)) {
            status = "active";
        }

        if (!StringUtils.hasText(name)
                || !StringUtils.hasText(slug)
                || !StringUtils.hasText(ownerEmail)
                || !StringUtils.hasText(ownerName)
                || !StringUtils.hasText(ownerPassword)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학원명, slug, 원장 이메일, 원장 이름, 임시 비밀번호가 필요합니다.");
        }

        if (!StringUtils.hasText(plan)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 플랜입니다.");
        }

        if (!StringUtils.hasText(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 학원 상태입니다.");
        }

        if (ownerPassword.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "원장 임시 비밀번호는 8자 이상이어야 합니다.");
        }

        if (academyClient.findAcademyBySlug(slug).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 slug입니다. 다른 slug를 입력해 주세요.");
        }

        String normalizedOwnerEmail = ownerEmail.toLowerCase(Locale.ROOT);
        boolean hasUser = authAdminClient.listUsers().stream()
                .map(AuthUserRecord::email)
                .filter(StringUtils::hasText)
                .anyMatch(email -> email.equalsIgnoreCase(normalizedOwnerEmail));
        if (hasUser) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "이미 Supabase Auth에 등록된 이메일입니다. 다른 이메일을 사용하거나 기존 계정 연결 정책을 별도로 정해야 합니다."
            );
        }

        AuthUserRecord owner = authAdminClient.createOwner(normalizedOwnerEmail, ownerPassword, ownerName);
        String academyId = null;
        try {
            var academy = academyClient.insertAcademy(name, slug, category, plan, status, owner.id())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "학원을 생성하지 못했습니다."));
            academyId = academy.id();
            academyClient.insertSettings(academyId);
            academyClient.insertOwnerProfile(academyId, owner.id(), normalizedOwnerEmail, ownerName);
            return PlatformAcademyResponse.academy("학원과 원장 계정을 생성했습니다.", toItem(academy));
        } catch (RuntimeException exception) {
            if (academyId != null) {
                academyClient.deleteAcademy(academyId);
            }
            authAdminClient.deleteUser(owner.id());
            throw exception;
        }
    }

    private PlatformAcademyResponse updateAcademyStatus(PlatformAcademyRequest request) {
        String academyId = optionalText(request.academyId());
        String rawStatus = optionalText(request.status());
        String rawPlan = optionalText(request.plan());
        String status = parse(rawStatus, STATUSES);
        String plan = parse(rawPlan, PLANS);

        if (!StringUtils.hasText(academyId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "학원 ID가 필요합니다.");
        }

        if (!StringUtils.hasText(rawStatus) && !StringUtils.hasText(rawPlan)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "변경할 상태 또는 플랜이 필요합니다.");
        }

        if (StringUtils.hasText(rawStatus) && !StringUtils.hasText(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 학원 상태입니다.");
        }

        if (StringUtils.hasText(rawPlan) && !StringUtils.hasText(plan)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 플랜입니다.");
        }

        var academy = academyClient.updateAcademy(academyId, status, plan)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "학원을 찾을 수 없습니다."));

        return PlatformAcademyResponse.academy("학원 상태를 수정했습니다.", toItem(academy));
    }

    private PlatformAcademyItem toItem(SupabasePlatformAcademyClient.AcademyRecord academy) {
        return new PlatformAcademyItem(
                academy.id(),
                academy.name(),
                academy.slug(),
                academy.plan(),
                academy.status(),
                academy.category(),
                academy.ownerUserId(),
                academy.createdAt()
        );
    }

    private String optionalText(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        return value.trim();
    }

    private String normalizeSlug(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        String normalized = value.toLowerCase(Locale.ROOT)
                .trim()
                .replaceAll("[^a-z0-9-]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
        return StringUtils.hasText(normalized) ? normalized : null;
    }

    private String parse(String value, Set<String> allowed) {
        String text = optionalText(value);
        return text != null && allowed.contains(text) ? text : null;
    }
}
