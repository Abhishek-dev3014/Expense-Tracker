package com.expensetracker.features.analytics.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public final class PlanningRequests {
    private PlanningRequests() {}

    public record Coverage(@NotNull LocalDate from, @NotNull LocalDate through) {}

    public record Scenario(
            @NotBlank @Pattern(regexp = "\\d{4}-\\d{2}") String month,
            @NotBlank @Size(max = 40) String category,
            @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal reductionPercent,
            @Pattern(regexp = "[0-9a-fA-F]{24}") String goalId) {}

    public record ScenarioResult(
            String kind,
            String month,
            String category,
            BigDecimal recordedSpending,
            BigDecimal reductionPercent,
            BigDecimal potentialReduction,
            BigDecimal adjustedSpending,
            String explanation,
            GoalImpact goalImpact) {}

    public record GoalImpact(
            String goalId,
            String name,
            BigDecimal remainingBefore,
            BigDecimal remainingAfter,
            BigDecimal possibleContribution) {}

    public record Feedback(
            @NotBlank @Pattern(regexp = "\\d{4}-\\d{2}") String month,
            @NotBlank @Pattern(regexp = "helpful|dismissed|expected") String response) {}

    public record Confirm(@NotBlank @Pattern(regexp = "\\d{4}-\\d{2}") String month) {}
}
