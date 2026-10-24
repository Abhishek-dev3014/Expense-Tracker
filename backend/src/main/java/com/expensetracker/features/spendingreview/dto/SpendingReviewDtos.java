package com.expensetracker.features.spendingreview.dto;

import com.expensetracker.features.spendingreview.domain.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class SpendingReviewDtos {
    private SpendingReviewDtos() {}

    public record Preferences(
            @NotNull Boolean learningEnabled, @NotNull Boolean foodGuideEnabled) {}

    public record Rule(
            @NotBlank @Size(max = 200) String description,
            @NotBlank @Pattern(regexp = "good|fine|improve") String value) {}

    public record Rating(
            @NotBlank @Pattern(regexp = "good|fine|improve|unreviewed") String value) {}

    public record Suggest(
            @NotBlank @Size(max = 200) String description,
            @Pattern(regexp = "[a-fA-F0-9]{24}") String excludeTransactionId) {}

    public record Suggestion(
            String value,
            String source,
            String explanation,
            String methodVersion,
            int trainingExamples,
            int supportingExamples) {}

    public record Total(String value, BigDecimal amount, int count) {}

    public record Purchase(
            String id,
            String description,
            String category,
            BigDecimal amount,
            LocalDate date,
            String value) {}

    public record Review(
            String month,
            String timezone,
            List<Total> totals,
            int reviewedCount,
            int expenseCount,
            List<Purchase> purchases,
            SpendingPreferences preferences,
            List<SpendingValueRule> rules) {}
}
