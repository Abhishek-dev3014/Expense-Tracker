package com.expensetracker.features.analytics.dto;

import java.math.BigDecimal;
import java.util.*;

public record InsightsResponse(
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        String savingsRate,
        List<SpendingInsight> insights) {}
