package com.expensetracker.features.category.dto;

import jakarta.validation.constraints.*;

public record CategoryRuleRequest(
        @NotBlank @Size(max = 200) String description,
        @NotBlank @Size(max = 40) String category,
        @NotNull Boolean enabled) {}
