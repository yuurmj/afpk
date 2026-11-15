package com.afpk.backend.ai;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "gemini")
public record GeminiProperties(String apiKey, String model, Duration connectTimeout,
                               Duration readTimeout, int maxOutputTokens) {}
