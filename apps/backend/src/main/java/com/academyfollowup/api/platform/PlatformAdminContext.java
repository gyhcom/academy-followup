package com.academyfollowup.api.platform;

public record PlatformAdminContext(
        String userId,
        String email,
        String role
) {
}
