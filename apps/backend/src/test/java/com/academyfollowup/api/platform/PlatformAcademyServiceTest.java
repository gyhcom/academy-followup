package com.academyfollowup.api.platform;

import com.academyfollowup.api.member.AuthUserRecord;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PlatformAcademyServiceTest {

    private final SupabasePlatformAcademyClient academyClient = mock(SupabasePlatformAcademyClient.class);
    private final PlatformAuthAdminClient authAdminClient = mock(PlatformAuthAdminClient.class);
    private final PlatformAcademyService service = new PlatformAcademyService(academyClient, authAdminClient);

    @Test
    void createsAcademyOwnerSettingsAndProfile() {
        when(academyClient.findAcademyBySlug("thebaeum")).thenReturn(Optional.empty());
        when(authAdminClient.listUsers()).thenReturn(List.of());
        when(authAdminClient.createOwner("owner@test.com", "password1", "김원장"))
                .thenReturn(new AuthUserRecord("owner-1", "owner@test.com"));
        when(academyClient.insertAcademy("더배움", "thebaeum", "영수", "pilot", "active", "owner-1"))
                .thenReturn(Optional.of(new SupabasePlatformAcademyClient.AcademyRecord(
                        "academy-1",
                        "더배움",
                        "thebaeum",
                        "pilot",
                        "active",
                        "영수",
                        "owner-1",
                        "2026-06-01T00:00:00Z"
                )));

        PlatformAcademyResponse response = service.handle(new PlatformAcademyRequest(
                "create",
                null,
                "더배움",
                "thebaeum",
                "영수",
                "pilot",
                "active",
                "owner@test.com",
                "김원장",
                "password1"
        ));

        assertThat(response.message()).isEqualTo("학원과 원장 계정을 생성했습니다.");
        assertThat(response.academy().id()).isEqualTo("academy-1");
        verify(academyClient).insertSettings("academy-1");
        verify(academyClient).insertOwnerProfile("academy-1", "owner-1", "owner@test.com", "김원장");
    }

    @Test
    void blocksDuplicateSlugAndOwnerEmail() {
        when(academyClient.findAcademyBySlug("thebaeum"))
                .thenReturn(Optional.of(new SupabasePlatformAcademyClient.IdRecord("academy-1")));

        PlatformAcademyRequest duplicateSlug = new PlatformAcademyRequest(
                "create",
                null,
                "더배움",
                "thebaeum",
                null,
                "pilot",
                "active",
                "owner@test.com",
                "김원장",
                "password1"
        );

        assertThatThrownBy(() -> service.handle(duplicateSlug))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("이미 사용 중인 slug입니다.");

        when(academyClient.findAcademyBySlug("new-academy")).thenReturn(Optional.empty());
        when(authAdminClient.listUsers()).thenReturn(List.of(new AuthUserRecord("owner-1", "owner@test.com")));

        PlatformAcademyRequest duplicateEmail = new PlatformAcademyRequest(
                "create",
                null,
                "새 학원",
                "new-academy",
                null,
                "pilot",
                "active",
                "OWNER@test.com",
                "김원장",
                "password1"
        );

        assertThatThrownBy(() -> service.handle(duplicateEmail))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("이미 Supabase Auth에 등록된 이메일입니다.");
    }

    @Test
    void updatesAcademyStatusAndPlan() {
        when(academyClient.updateAcademy("academy-1", "paused", "standard")).thenReturn(Optional.of(
                new SupabasePlatformAcademyClient.AcademyRecord(
                        "academy-1",
                        "더배움",
                        "thebaeum",
                        "standard",
                        "paused",
                        null,
                        "owner-1",
                        "2026-06-01T00:00:00Z"
                )
        ));

        PlatformAcademyResponse response = service.handle(new PlatformAcademyRequest(
                "update_status",
                "academy-1",
                null,
                null,
                null,
                "standard",
                "paused",
                null,
                null,
                null
        ));

        assertThat(response.message()).isEqualTo("학원 상태를 수정했습니다.");
        assertThat(response.academy().status()).isEqualTo("paused");
    }

    @Test
    void rollsBackAuthUserWhenAcademyInitializationFails() {
        when(academyClient.findAcademyBySlug("thebaeum")).thenReturn(Optional.empty());
        when(authAdminClient.listUsers()).thenReturn(List.of());
        when(authAdminClient.createOwner("owner@test.com", "password1", "김원장"))
                .thenReturn(new AuthUserRecord("owner-1", "owner@test.com"));
        when(academyClient.insertAcademy("더배움", "thebaeum", null, "pilot", "active", "owner-1"))
                .thenReturn(Optional.of(new SupabasePlatformAcademyClient.AcademyRecord(
                        "academy-1",
                        "더배움",
                        "thebaeum",
                        "pilot",
                        "active",
                        null,
                        "owner-1",
                        "2026-06-01T00:00:00Z"
                )));
        org.mockito.Mockito.doThrow(new ResponseStatusException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "설정 실패"))
                .when(academyClient)
                .insertSettings("academy-1");

        assertThatThrownBy(() -> service.handle(new PlatformAcademyRequest(
                "create",
                null,
                "더배움",
                "thebaeum",
                null,
                "pilot",
                "active",
                "owner@test.com",
                "김원장",
                "password1"
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("설정 실패");

        verify(academyClient).deleteAcademy("academy-1");
        verify(authAdminClient).deleteUser("owner-1");
    }
}
