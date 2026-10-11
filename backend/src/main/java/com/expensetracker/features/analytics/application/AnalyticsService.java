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
                current.income()
                        .subtract(average.multiply(BigDecimal.valueOf(now.lengthOfMonth()))),
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

    public InsightsResponse insights(String user) {
        var all = transactions.all(user);
        var metrics = TransactionReadService.metrics(all);
        double savings =
                metrics.income().signum() == 0
                        ? 0
                        : metrics.balance().doubleValue() / metrics.income().doubleValue() * 100;
        var result = new ArrayList<SpendingInsight>();
        result.add(
                savings < 20
                        ? new SpendingInsight(
                                "warning",
                                "Your savings rate is below 20%. Review subscriptions and discretionary spending against your own goals.",
                                "TrendingDown")
                        : new SpendingInsight(
                                "success",
                                "You are saving "
                                        + Math.round(savings)
                                        + "% of your recorded income. Keep tracking progress toward your goals.",
                                "ShieldCheck"));
        var categories = TransactionReadService.breakdown(all);
        if (!categories.isEmpty())
            result.add(
                    new SpendingInsight(
                            "info",
                            "Your top expense is "
                                    + categories.getFirst().category()
                                    + " (₹"
                                    + categories.getFirst().amount().toPlainString()
                                    + ").",
                            "BarChart3"));
        var now = LocalDate.now(clock);
        var month = YearMonth.from(now);
        budgets.find(user, month)
                .filter(b -> b.getMonthlyLimit().signum() > 0)
                .ifPresent(
                        b -> {
                            double spending =
                                    TransactionReadService.metrics(transactions.month(user, month))
                                                    .expense()
                                                    .doubleValue()
                                            / b.getMonthlyLimit().doubleValue();
                            double elapsed = (double) now.getDayOfMonth() / now.lengthOfMonth();
                            if (spending > elapsed + 0.15)
                                result.add(
                                        new SpendingInsight(
                                                "warning",
                                                "You have used "
                                                        + Math.round(spending * 100)
                                                        + "% of your monthly budget. Review your spending pace.",
                                                "Zap"));
                            else if (spending < elapsed - 0.1)
                                result.add(
                                        new SpendingInsight(
                                                "success",
                                                "Your spending is below your budget's pace this month.",
                                                "ZapOff"));
                        });
        long uncategorized =
                all.stream()
                        .filter(
                                tx ->
                                        tx.getCategory() == null
                                                || "General".equals(tx.getCategory()))
                        .count();
        if (uncategorized > 5)
            result.add(
                    new SpendingInsight(
                            "tip",
                            "You have "
                                    + uncategorized
                                    + " uncategorized transactions. Add categories for clearer insights.",
                            "Tag"));
        return new InsightsResponse(
                metrics.income(),
                metrics.expense(),
                String.format(Locale.ROOT, "%.2f", savings),
                result);
    }
}
