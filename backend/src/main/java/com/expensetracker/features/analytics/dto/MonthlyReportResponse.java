package com.expensetracker.features.analytics.dto;

import com.expensetracker.features.transaction.domain.Transaction;
import com.expensetracker.features.transaction.domain.TransactionMetrics;
import com.expensetracker.features.transaction.dto.CategorySpending;
import java.math.BigDecimal;
import java.util.*;

public record MonthlyReportResponse(
        String month,
        BigDecimal income,
        BigDecimal expense,
        BigDecimal balance,
        int count,
        TransactionMetrics previousMonth,
        List<CategorySpending> breakdown,
        List<Transaction> transactions) {}
