package com.expensetracker.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("app")
public record AppProperties(
        @NotBlank String jwtSecret,
        Duration jwtTtl,
        @NotEmpty List<String> allowedOrigins,
        @NotBlank String mlServiceUrl,
        Duration mlTimeout,
        @NotBlank String timeZone) {}
