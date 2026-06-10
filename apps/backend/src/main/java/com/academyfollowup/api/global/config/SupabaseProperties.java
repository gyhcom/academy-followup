package com.academyfollowup.api.global.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "academy-followup.supabase")
public record SupabaseProperties(
        String url,
        String serviceRoleKey
) {
}

