package com.expensetracker.features.transaction.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.*;

public record CreateTransactionRequest(
        @NotBlank @Size(max = 200) String title,
        @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 12, fraction = 2)
                BigDecimal amount,
        @Size(max = 40) String category,
        @Size(max = 40) String date,
        @Pattern(regexp = "income|expense") String type) {}
