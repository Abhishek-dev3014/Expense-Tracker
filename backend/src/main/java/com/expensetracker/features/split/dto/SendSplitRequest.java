package com.expensetracker.features.split.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.*;

public record SendSplitRequest(
        @NotBlank @Email String toEmail,
        @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 12, fraction = 2)
                BigDecimal amount,
        @NotBlank @Size(max = 200) String transactionTitle) {}
