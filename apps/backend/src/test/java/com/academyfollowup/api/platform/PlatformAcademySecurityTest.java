package com.academyfollowup.api.platform;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PlatformAcademySecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PlatformAdminAuthService platformAdminAuthService;

    @MockBean
    private PlatformAcademyService platformAcademyService;

    @Test
    void platformAcademiesRequireBearerToken() throws Exception {
        when(platformAdminAuthService.resolve(null)).thenThrow(new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "로그인이 필요합니다."
        ));

        mockMvc.perform(get("/api/platform/academies"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("로그인이 필요합니다."));
    }

    @Test
    void blocksNonPlatformAdmin() throws Exception {
        when(platformAdminAuthService.resolve("Bearer user-token")).thenThrow(new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "슈퍼어드민 권한이 필요합니다."
        ));

        mockMvc.perform(get("/api/platform/academies").header("Authorization", "Bearer user-token"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("슈퍼어드민 권한이 필요합니다."));
    }

    @Test
    void createsAcademyForPlatformAdmin() throws Exception {
        PlatformAdminContext context = new PlatformAdminContext("admin-1", "admin@test.com", "admin");
        when(platformAdminAuthService.resolve("Bearer admin-token")).thenReturn(context);
        when(platformAcademyService.handle(any(PlatformAcademyRequest.class))).thenReturn(
                PlatformAcademyResponse.academy(
                        "학원과 원장 계정을 생성했습니다.",
                        new PlatformAcademyItem(
                                "academy-1",
                                "더배움",
                                "thebaeum",
                                "pilot",
                                "active",
                                null,
                                "owner-1",
                                "2026-06-01T00:00:00Z"
                        )
                )
        );

        mockMvc.perform(post("/api/platform/academies")
                        .header("Authorization", "Bearer admin-token")
                        .contentType("application/json")
                        .content("{\"action\":\"create\",\"name\":\"더배움\",\"slug\":\"thebaeum\",\"plan\":\"pilot\",\"ownerEmail\":\"owner@test.com\",\"ownerName\":\"김원장\",\"ownerPassword\":\"password1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("학원과 원장 계정을 생성했습니다."))
                .andExpect(jsonPath("$.academy.id").value("academy-1"));
    }
}
