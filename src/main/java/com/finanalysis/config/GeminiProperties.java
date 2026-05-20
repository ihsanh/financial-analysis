package com.finanalysis.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "gemini")
public record GeminiProperties(
        String apiKey,
        String model
) {
    public GeminiProperties {
        if (model == null || model.isBlank()) model = "gemini-2.5-flash";
    }
}
