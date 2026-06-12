package com.academyfollowup.api.global.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "academy-followup.solapi")
public record SolapiProperties(
        String apiKey,
        String apiSecret,
        String senderPhone
) {
}
