package com.academyfollowup.api.member;

public record MemberRequest(
        String memberId,
        String name,
        String email,
        String phone,
        String role,
        String status,
        String password
) {
}
