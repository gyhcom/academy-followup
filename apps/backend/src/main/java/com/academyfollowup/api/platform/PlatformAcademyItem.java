package com.academyfollowup.api.platform;

public record PlatformAcademyItem(
        String id,
        String name,
        String slug,
        String plan,
        String status,
        String category,
        String ownerUserId,
        String createdAt
) {
}
