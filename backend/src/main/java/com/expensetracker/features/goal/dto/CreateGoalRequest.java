package com.expensetracker.features.goal.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.*;

public record CreateGoalRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 12, fraction = 2)
                BigDecimal targetAmount,
        @Size(max = 40) String category,
        @Size(max = 40) String deadline) {}
