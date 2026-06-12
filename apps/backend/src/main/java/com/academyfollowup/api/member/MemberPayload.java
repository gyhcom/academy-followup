package com.academyfollowup.api.member;

public record MemberPayload(
        String memberId,
        String name,
        String email,
        String phone,
        String role,
        String status,
        String password
) {
}
