package com.expensetracker.features.budget.application;

import com.expensetracker.features.budget.domain.Budget;
import com.expensetracker.features.budget.dto.BudgetUsageResponse;
import com.expensetracker.features.budget.dto.SaveBudgetRequest;
import com.expensetracker.features.budget.infrastructure.BudgetOperations;
import com.expensetracker.features.budget.infrastructure.BudgetRepository;
import com.expensetracker.features.transaction.application.TransactionReadService;
import java.math.BigDecimal;
import java.time.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class BudgetService {
    private final BudgetRepository budgets;
    private final BudgetOperations operations;
    private final TransactionReadService transactions;
    private final Clock clock;

    public Budget save(String user, SaveBudgetRequest input) {
        return operations.upsert(user, YearMonth.now(clock).toString(), input);
    }

    public java.util.Optional<Budget> find(String user, YearMonth month) {
        return budgets.findByUserAndMonth(user, month.toString());
    }

    public BudgetUsageResponse usage(String user) {
        var month = YearMonth.now(clock);
        var budget = budgets.findByUserAndMonth(user, month.toString()).orElse(null);
        var used = TransactionReadService.metrics(transactions.month(user, month)).expense();
        return new BudgetUsageResponse(
                budget,
                used,
                budget == null ? BigDecimal.ZERO : budget.getMonthlyLimit().subtract(used));
    }
}
