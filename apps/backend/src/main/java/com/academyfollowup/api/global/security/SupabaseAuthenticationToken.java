package com.academyfollowup.api.global.security;

import java.util.Collection;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;

public class SupabaseAuthenticationToken extends AbstractAuthenticationToken {

    private final WorkspaceContext workspaceContext;

    public SupabaseAuthenticationToken(
            WorkspaceContext workspaceContext,
            Collection<? extends GrantedAuthority> authorities
    ) {
        super(authorities);
        this.workspaceContext = workspaceContext;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return "";
    }

    @Override
    public Object getPrincipal() {
        return workspaceContext;
    }

    public WorkspaceContext getWorkspaceContext() {
        return workspaceContext;
    }
}
