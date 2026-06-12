package com.academyfollowup.api.member;

import com.academyfollowup.api.global.security.WorkspaceContext;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MemberServiceTest {

    private final SupabaseMemberClient memberClient = mock(SupabaseMemberClient.class);
    private final SupabaseAuthAdminClient authAdminClient = mock(SupabaseAuthAdminClient.class);
    private final MemberService service = new MemberService(memberClient, authAdminClient);

    @Test
    void returnsMembersForOwner() {
        WorkspaceContext workspace = owner();
        when(memberClient.findMembers("academy-1")).thenReturn(List.of(
                new SupabaseMemberClient.MemberRecord(
                        "teacher-1",
                        "teacher@test.com",
                        "테스트 선생님",
                        "01012345678",
                        "teacher",
                        "active",
                        "academy-1"
                )
        ));

        var members = service.findMembers(workspace);

        assertThat(members).hasSize(1);
        assertThat(members.getFirst().email()).isEqualTo("teacher@test.com");
    }

    @Test
    void blocksTeacherRole() {
        WorkspaceContext workspace = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");

        assertThatThrownBy(() -> service.findMembers(workspace))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("구성원 관리는 원장 또는 관리자만 할 수 있습니다.");
    }

    @Test
    void createsAuthUserAndProfile() {
        WorkspaceContext workspace = owner();
        MemberRequest request = new MemberRequest(
                null,
                "신규 선생님",
                "NewTeacher@Test.COM",
                "010-1234-5678",
                "teacher",
                "active",
                "12345678"
        );
        MemberPayload payload = new MemberPayload(
                null,
                "신규 선생님",
                "newteacher@test.com",
                "01012345678",
                "teacher",
                "active",
                "12345678"
        );
        AuthUserRecord authUser = new AuthUserRecord("member-1", "newteacher@test.com");
        when(authAdminClient.createUser("academy-1", payload)).thenReturn(authUser);
        when(memberClient.insertProfile("academy-1", authUser, payload)).thenReturn(
                new SupabaseMemberClient.MemberRecord(
                        "member-1",
                        "newteacher@test.com",
                        "신규 선생님",
                        "01012345678",
                        "teacher",
                        "active",
                        "academy-1"
                )
        );

        var member = service.createMember(workspace, request);

        assertThat(member.id()).isEqualTo("member-1");
        assertThat(member.email()).isEqualTo("newteacher@test.com");
    }

    @Test
    void rollsBackAuthUserWhenProfileInsertFails() {
        WorkspaceContext workspace = owner();
        MemberRequest request = new MemberRequest(
                null,
                "신규 선생님",
                "teacher@test.com",
                "",
                "teacher",
                "active",
                "12345678"
        );
        MemberPayload payload = new MemberPayload(
                null,
                "신규 선생님",
                "teacher@test.com",
                null,
                "teacher",
                "active",
                "12345678"
        );
        AuthUserRecord authUser = new AuthUserRecord("member-1", "teacher@test.com");
        when(authAdminClient.createUser("academy-1", payload)).thenReturn(authUser);
        when(memberClient.insertProfile("academy-1", authUser, payload)).thenThrow(
                new ResponseStatusException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "구성원 저장 중 오류가 발생했습니다.")
        );

        assertThatThrownBy(() -> service.createMember(workspace, request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("구성원 저장 중 오류가 발생했습니다.");
        verify(authAdminClient).deleteUser("member-1");
    }

    @Test
    void blocksSelfDemotionOrDeactivation() {
        WorkspaceContext workspace = owner();

        assertThatThrownBy(() -> service.updateMember(workspace, new MemberRequest(
                "owner-1",
                "원장",
                "owner@test.com",
                "",
                "teacher",
                "active",
                ""
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("현재 로그인한 관리자 계정은 비활성화하거나 권한을 낮출 수 없습니다.");

        assertThatThrownBy(() -> service.updateMember(workspace, new MemberRequest(
                "owner-1",
                "원장",
                "owner@test.com",
                "",
                "owner",
                "inactive",
                ""
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("현재 로그인한 관리자 계정은 비활성화하거나 권한을 낮출 수 없습니다.");
    }

    @Test
    void updatesExistingMember() {
        WorkspaceContext workspace = owner();
        MemberPayload payload = new MemberPayload(
                "teacher-1",
                "수정 선생님",
                "teacher@test.com",
                null,
                "teacher",
                "inactive",
                null
        );
        when(memberClient.findMember("academy-1", "teacher-1")).thenReturn(Optional.of(
                new SupabaseMemberClient.MemberRecord(
                        "teacher-1",
                        "teacher@test.com",
                        "기존 선생님",
                        null,
                        "teacher",
                        "active",
                        "academy-1"
                )
        ));
        when(memberClient.updateProfile("academy-1", payload)).thenReturn(Optional.of(
                new SupabaseMemberClient.MemberRecord(
                        "teacher-1",
                        "teacher@test.com",
                        "수정 선생님",
                        null,
                        "teacher",
                        "inactive",
                        "academy-1"
                )
        ));

        var member = service.updateMember(workspace, new MemberRequest(
                "teacher-1",
                "수정 선생님",
                "teacher@test.com",
                "",
                "teacher",
                "inactive",
                ""
        ));

        assertThat(member.status()).isEqualTo("inactive");
        verify(authAdminClient).updateUser("academy-1", payload);
    }

    @Test
    void validatesCreateRequest() {
        WorkspaceContext workspace = owner();

        assertThatThrownBy(() -> service.createMember(workspace, new MemberRequest(
                null,
                "",
                "teacher@test.com",
                "",
                "teacher",
                "active",
                "12345678"
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("이름이 필요합니다.");

        assertThatThrownBy(() -> service.createMember(workspace, new MemberRequest(
                null,
                "선생님",
                "teacher@test.com",
                "",
                "unknown",
                "active",
                "12345678"
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("구성원 역할을 확인해 주세요.");

        assertThatThrownBy(() -> service.createMember(workspace, new MemberRequest(
                null,
                "선생님",
                "teacher@test.com",
                "",
                "teacher",
                "active",
                "1234"
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("임시 비밀번호는 8자 이상으로 입력해 주세요.");
    }

    private WorkspaceContext owner() {
        return new WorkspaceContext("owner-1", "academy-1", "owner", "active");
    }
}
