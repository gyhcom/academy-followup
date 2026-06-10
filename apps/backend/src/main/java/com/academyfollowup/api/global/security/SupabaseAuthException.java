package com.academyfollowup.api.global.security;

import org.springframework.http.HttpStatus;

public class SupabaseAuthException extends RuntimeException {

    private final HttpStatus status;

    public SupabaseAuthException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
