package com.academyfollowup.api.global.security;

public record WorkspaceContext(
        String userId,
        String academyId,
        String role,
        String status
) {
    public boolean canManageAcademy() {
        return "owner".equals(role) || "manager".equals(role);
    }
}
