package com.academyfollowup.api.message;

public class DuplicateMessageException extends RuntimeException {

    private final int duplicateGuardMinutes;

    public DuplicateMessageException(String message, int duplicateGuardMinutes) {
        super(message);
        this.duplicateGuardMinutes = duplicateGuardMinutes;
    }

    public int duplicateGuardMinutes() {
        return duplicateGuardMinutes;
    }
}
