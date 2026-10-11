package com.expensetracker.features.split.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.*;

public record SplitParticipantRequest(
        @NotBlank @Size(max = 100) String name,
        @Email String email,
        @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 12, fraction = 2)
                BigDecimal amount,
        @Pattern(regexp = "pending|settled") String status) {}
