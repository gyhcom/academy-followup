package com.academyfollowup.api.platform;

import java.util.List;

public record PlatformAcademyResponse(
        String message,
        PlatformAcademyItem academy,
        List<PlatformAcademyItem> academies
) {
    public static PlatformAcademyResponse academies(List<PlatformAcademyItem> academies) {
        return new PlatformAcademyResponse(null, null, academies);
    }

    public static PlatformAcademyResponse academy(String message, PlatformAcademyItem academy) {
        return new PlatformAcademyResponse(message, academy, null);
    }
}
