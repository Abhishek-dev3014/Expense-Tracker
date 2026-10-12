package com.expensetracker.features.recurring.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.*;

public record UpdateRecurringRequest(
        @Size(min = 1, max = 200) String title,
        @DecimalMin(value = "0", inclusive = false) @Digits(integer = 12, fraction = 2)
                BigDecimal amount,
        @Size(min = 1, max = 40) String category,
        @Pattern(regexp = "income|expense") String type,
        @Pattern(regexp = "daily|weekly|monthly|yearly") String frequency,
        @Pattern(regexp = "active|paused") String status) {}
