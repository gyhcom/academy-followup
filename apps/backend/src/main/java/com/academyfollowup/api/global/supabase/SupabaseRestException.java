package com.academyfollowup.api.global.supabase;

public class SupabaseRestException extends RuntimeException {

    public SupabaseRestException(String message) {
        super(message);
    }
}
