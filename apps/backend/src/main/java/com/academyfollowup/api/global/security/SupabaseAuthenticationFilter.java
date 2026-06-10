package com.academyfollowup.api.global.security;

import com.academyfollowup.api.global.error.ApiErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class SupabaseAuthenticationFilter extends OncePerRequestFilter {

    private final SupabaseAuthService supabaseAuthService;
    private final ObjectMapper objectMapper;

    public SupabaseAuthenticationFilter(
            SupabaseAuthService supabaseAuthService,
            ObjectMapper objectMapper
    ) {
        this.supabaseAuthService = supabaseAuthService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getRequestURI();

        if (!path.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String accessToken = extractBearerToken(request);

        if (!StringUtils.hasText(accessToken)) {
            writeError(response, HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
            return;
        }

        try {
            WorkspaceContext workspaceContext = supabaseAuthService.resolveWorkspace(accessToken);
            SupabaseAuthenticationToken authentication = new SupabaseAuthenticationToken(
                    workspaceContext,
                    List.of(new SimpleGrantedAuthority("ROLE_" + workspaceContext.role().toUpperCase()))
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
        } catch (SupabaseAuthException exception) {
            SecurityContextHolder.clearContext();
            writeError(response, exception.getStatus(), exception.getMessage());
        }
    }

    private String extractBearerToken(HttpServletRequest request) {
        String authorizationHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (!StringUtils.hasText(authorizationHeader) || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }

        return authorizationHeader.substring("Bearer ".length()).trim();
    }

    private void writeError(
            HttpServletResponse response,
            HttpStatus status,
            String message
    ) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), new ApiErrorResponse(message));
    }
}
