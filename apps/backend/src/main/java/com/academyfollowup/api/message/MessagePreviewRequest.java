package com.academyfollowup.api.message;

public record MessagePreviewRequest(
        String studentId,
        String reason,
        String makeupCandidateTime
) {
}
