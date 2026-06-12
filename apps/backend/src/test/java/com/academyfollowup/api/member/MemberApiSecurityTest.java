package com.academyfollowup.api.member;

import com.academyfollowup.api.global.security.SupabaseAuthService;
import com.academyfollowup.api.global.security.WorkspaceContext;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class MemberApiSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SupabaseAuthService supabaseAuthService;

    @MockBean
    private MemberService memberService;

    @Test
    void membersRequireBearerToken() throws Exception {
        mockMvc.perform(get("/api/members"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("로그인이 필요합니다."));
    }

    @Test
    void returnsMembersForOwner() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(supabaseAuthService.resolveWorkspace("owner-token")).thenReturn(workspaceContext);
        when(memberService.findMembers(eq(workspaceContext))).thenReturn(List.of(
                new MemberResponse.MemberItem(
                        "teacher-1",
                        "테스트 선생님",
                        "teacher@test.com",
                        null,
                        "teacher",
                        "active"
                )
        ));

        mockMvc.perform(get("/api/members").header("Authorization", "Bearer owner-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.members[0].id").value("teacher-1"))
                .andExpect(jsonPath("$.members[0].email").value("teacher@test.com"));
    }

    @Test
    void createsMemberForOwner() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("owner-1", "academy-1", "owner", "active");
        when(supabaseAuthService.resolveWorkspace("owner-token")).thenReturn(workspaceContext);
        when(memberService.createMember(eq(workspaceContext), any(MemberRequest.class))).thenReturn(
                new MemberResponse.MemberItem(
                        "member-1",
                        "신규 선생님",
                        "teacher@test.com",
                        null,
                        "teacher",
                        "active"
                )
        );

        mockMvc.perform(post("/api/members")
                        .header("Authorization", "Bearer owner-token")
                        .contentType("application/json")
                        .content("""
                                {
                                  "name": "신규 선생님",
                                  "email": "teacher@test.com",
                                  "phone": "",
                                  "role": "teacher",
                                  "status": "active",
                                  "password": "12345678"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.member.id").value("member-1"));
    }

    @Test
    void updatesMemberForManager() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("manager-1", "academy-1", "manager", "active");
        when(supabaseAuthService.resolveWorkspace("manager-token")).thenReturn(workspaceContext);
        when(memberService.updateMember(eq(workspaceContext), any(MemberRequest.class))).thenReturn(
                new MemberResponse.MemberItem(
                        "teacher-1",
                        "수정 선생님",
                        "teacher@test.com",
                        null,
                        "teacher",
                        "inactive"
                )
        );

        mockMvc.perform(patch("/api/members")
                        .header("Authorization", "Bearer manager-token")
                        .contentType("application/json")
                        .content("""
                                {
                                  "memberId": "teacher-1",
                                  "name": "수정 선생님",
                                  "email": "teacher@test.com",
                                  "phone": "",
                                  "role": "teacher",
                                  "status": "inactive",
                                  "password": ""
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.member.status").value("inactive"));
    }

    @Test
    void returnsForbiddenFromService() throws Exception {
        WorkspaceContext workspaceContext = new WorkspaceContext("teacher-1", "academy-1", "teacher", "active");
        when(supabaseAuthService.resolveWorkspace("teacher-token")).thenReturn(workspaceContext);
        when(memberService.findMembers(eq(workspaceContext))).thenThrow(
                new ResponseStatusException(HttpStatus.FORBIDDEN, "구성원 관리는 원장 또는 관리자만 할 수 있습니다.")
        );

        mockMvc.perform(get("/api/members").header("Authorization", "Bearer teacher-token"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("구성원 관리는 원장 또는 관리자만 할 수 있습니다."));
    }
}
