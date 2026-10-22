package com.expensetracker.features.analytics.application;

import com.expensetracker.features.analytics.dto.DashboardResponse;
import com.expensetracker.features.analytics.dto.InsightsResponse;
import com.expensetracker.features.analytics.dto.MonthlyReportResponse;
import com.expensetracker.features.analytics.dto.SpendingInsight;
import com.expensetracker.features.budget.application.BudgetService;
import com.expensetracker.features.budget.domain.Budget;
import com.expensetracker.features.transaction.application.TransactionReadService;
import com.expensetracker.features.transaction.domain.Transaction;
import java.math.*;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AnalyticsService {
    private final TransactionReadService transactions;
    private final BudgetService budgets;
    private final Clock clock;
    private final AnalyticsPlanningService planning;

    public DashboardResponse overview(String user, int page) {
        var all = transactions.all(user);
        var totals = TransactionReadService.metrics(all);
        var now = LocalDate.now(clock);
        var current = TransactionReadService.metrics(transactions.month(user, YearMonth.from(now)));
        var average =
                current.expense()
                        .divide(BigDecimal.valueOf(now.getDayOfMonth()), 2, RoundingMode.HALF_UP);
        var recent =
                all.stream()
                        .sorted(
                                Comparator.comparing(
                                        Transaction::getCreatedAt,
                                        Comparator.nullsLast(Comparator.reverseOrder())))
                        .skip((long) (page - 1) * 5)
                        .limit(5)
                        .toList();
        var limit =
                budgets.find(user, YearMonth.from(now))
                        .map(Budget::getMonthlyLimit)
                        .orElse(BigDecimal.ZERO);
        return new DashboardResponse(
                totals.income(),
                totals.expense(),
                totals.balance(),
                null, // Legacy projection retired; use the explicit readiness-gated planning API.
                average,
                limit,
                recent,
                all,
                (int) Math.ceil(all.size() / 5.0),
                page);
    }

    public MonthlyReportResponse report(String user, int year, int month) {
        var selected = YearMonth.of(year, month);
        var txs = transactions.month(user, selected);
        var metrics = TransactionReadService.metrics(txs);
        return new MonthlyReportResponse(
                selected.toString(),
                metrics.income(),
                metrics.expense(),
                metrics.balance(),
                metrics.count(),
                TransactionReadService.metrics(transactions.month(user, selected.minusMonths(1))),
                TransactionReadService.breakdown(txs),
                txs);
    }

    /** Backward-compatible transport backed by the same period-aware insight engine. */
    public InsightsResponse insights(String user) {
        var data = planning.summary(user, null);
        return new InsightsResponse(
                data.summary().income(),
                data.summary().spending(),
                data.summary().savingsRate() == null
                        ? null
                        : data.summary().savingsRate().toPlainString(),
                data.insights().stream()
                        .map(
                                i ->
                                        new SpendingInsight(
                                                "review".equals(i.tone())
                                                        ? "warning"
                                                        : "progress".equals(i.tone())
                                                                ? "success"
                                                                : "info",
                                                i.message(),
                                                "progress".equals(i.tone())
                                                        ? "ShieldCheck"
                                                        : "BarChart3"))
                        .toList());
    }
}
