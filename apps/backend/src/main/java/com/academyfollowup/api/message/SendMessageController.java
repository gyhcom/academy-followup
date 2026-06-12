package com.academyfollowup.api.message;

import com.academyfollowup.api.global.security.WorkspaceContext;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/messages")
public class SendMessageController {

    private final SendMessageService sendMessageService;

    public SendMessageController(SendMessageService sendMessageService) {
        this.sendMessageService = sendMessageService;
    }

    @PostMapping("/send")
    public ResponseEntity<?> send(
            @AuthenticationPrincipal WorkspaceContext workspaceContext,
            @RequestBody SendMessageRequest request
    ) {
        try {
            return ResponseEntity.ok(sendMessageService.send(workspaceContext, request));
        } catch (DuplicateMessageException exception) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", exception.getMessage(),
                    "duplicate", true,
                    "duplicateGuardMinutes", exception.duplicateGuardMinutes()
            ));
        }
    }
}
