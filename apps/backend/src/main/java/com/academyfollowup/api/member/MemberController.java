package com.academyfollowup.api.member;

import com.academyfollowup.api.global.security.WorkspaceContext;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @GetMapping
    public MemberResponse members(@AuthenticationPrincipal WorkspaceContext workspaceContext) {
        return MemberResponse.members(memberService.findMembers(workspaceContext));
    }

    @PostMapping
    public MemberResponse create(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestBody MemberRequest request
    ) {
        return MemberResponse.member(memberService.createMember(workspaceContext, request));
    }

    @PatchMapping
    public MemberResponse update(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestBody MemberRequest request
    ) {
        return MemberResponse.member(memberService.updateMember(workspaceContext, request));
    }
}
