package com.academyfollowup.api.platform;

public record PlatformAcademyRequest(
        String action,
        String academyId,
        String name,
        String slug,
        String category,
        String plan,
        String status,
        String ownerEmail,
        String ownerName,
        String ownerPassword
) {
}
