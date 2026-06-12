package com.academyfollowup.api.member;

import java.util.List;

public record MemberResponse(List<MemberItem> members, MemberItem member) {

    public static MemberResponse members(List<MemberItem> members) {
        return new MemberResponse(members, null);
    }

    public static MemberResponse member(MemberItem member) {
        return new MemberResponse(null, member);
    }

    public record MemberItem(
            String id,
            String name,
            String email,
            String phone,
            String role,
            String status
    ) {
    }
}
