package com.expensetracker.features.budget.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.*;

public record SaveBudgetRequest(
        @NotNull @DecimalMin("0") @Digits(integer = 12, fraction = 2) BigDecimal monthlyLimit,
        Map<
                        @NotBlank String,
                        @NotNull @DecimalMin("0") @Digits(integer = 12, fraction = 2) BigDecimal>
                categoryLimits) {}
