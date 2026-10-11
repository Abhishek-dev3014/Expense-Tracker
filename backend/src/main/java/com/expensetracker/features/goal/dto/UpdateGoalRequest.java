package com.expensetracker.features.goal.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.*;

public record UpdateGoalRequest(
        @Size(min = 1, max = 100) String name,
        @DecimalMin(value = "0", inclusive = false) @Digits(integer = 12, fraction = 2)
                BigDecimal targetAmount,
        @DecimalMin("0") @Digits(integer = 12, fraction = 2) BigDecimal currentAmount,
        @Size(max = 40) String category,
        @Size(max = 40) String deadline,
        @Pattern(regexp = "active|completed|cancelled") String status) {}
