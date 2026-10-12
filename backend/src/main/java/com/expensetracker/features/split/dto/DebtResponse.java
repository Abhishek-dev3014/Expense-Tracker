package com.expensetracker.features.split.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

public record DebtResponse(
        String transactionId, String title, String person, BigDecimal amount, Instant date) {}
