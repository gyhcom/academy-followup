package com.academyfollowup.api.global.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "academy-followup.cors")
public record CorsProperties(
        List<String> allowedOrigins
) {
}
