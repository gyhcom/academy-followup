package com.academyfollowup.api.global.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SupabaseAuthenticationFilterTest {

    private final SupabaseAuthService supabaseAuthService = mock(SupabaseAuthService.class);
    private final SupabaseAuthenticationFilter filter = new SupabaseAuthenticationFilter(
            supabaseAuthService,
            new ObjectMapper()
    );

    @Test
    void ignoresNonApiPaths() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/health");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        verify(supabaseAuthService, never()).resolveWorkspace(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void returnsUnauthorizedWhenBearerTokenIsMissing() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/context");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(response.getContentAsString()).contains("로그인이 필요합니다.");
        verify(chain, never()).doFilter(
                org.mockito.ArgumentMatchers.any(HttpServletRequest.class),
                org.mockito.ArgumentMatchers.any(HttpServletResponse.class)
        );
    }

    @Test
    void storesWorkspaceContextWhenBearerTokenIsValid() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/context");
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer valid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);
        WorkspaceContext workspaceContext = new WorkspaceContext("user-1", "academy-1", "owner", "active");

        when(supabaseAuthService.resolveWorkspace("valid-token")).thenReturn(workspaceContext);

        try {
            filter.doFilter(request, response, chain);

            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            assertThat(authentication).isInstanceOf(SupabaseAuthenticationToken.class);
            assertThat(((SupabaseAuthenticationToken) authentication).getWorkspaceContext())
                    .isEqualTo(workspaceContext);
            verify(chain).doFilter(request, response);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
