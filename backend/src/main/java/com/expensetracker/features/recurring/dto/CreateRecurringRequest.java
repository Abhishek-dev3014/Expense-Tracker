package com.expensetracker.features.recurring.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.*;

public record CreateRecurringRequest(
        @NotBlank @Size(max = 200) String title,
        @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 12, fraction = 2)
                BigDecimal amount,
        @NotBlank @Size(max = 40) String category,
        @NotBlank @Pattern(regexp = "income|expense") String type,
        @NotBlank @Pattern(regexp = "daily|weekly|monthly|yearly") String frequency,
        @Size(max = 40) String startDate) {}
