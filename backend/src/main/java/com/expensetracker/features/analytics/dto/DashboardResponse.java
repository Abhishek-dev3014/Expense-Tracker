package com.expensetracker.features.analytics.dto;

import com.expensetracker.features.transaction.domain.Transaction;
import java.math.BigDecimal;
import java.util.*;

public record DashboardResponse(
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal totalBalance,
        BigDecimal predictedBalance,
        BigDecimal averageDailyExpense,
        BigDecimal monthlyBudgetLimit,
        List<Transaction> transactions,
        List<Transaction> allTransactions,
        int totalPages,
        int currentPage) {}
