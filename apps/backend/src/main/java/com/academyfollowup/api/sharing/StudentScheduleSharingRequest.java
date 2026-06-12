package com.academyfollowup.api.sharing;

public record StudentScheduleSharingRequest(
        String action,
        String studentId,
        String code,
        String linkId
) {
}
