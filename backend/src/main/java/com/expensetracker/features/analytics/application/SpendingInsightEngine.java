package com.expensetracker.features.analytics.application;

import static com.expensetracker.features.analytics.application.AnalyticsFacts.*;

import com.expensetracker.features.analytics.domain.AnalyticsCoverage;
import com.expensetracker.features.analytics.dto.PlanningResponse.*;
import com.expensetracker.features.transaction.domain.Transaction;
import java.math.*;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class SpendingInsightEngine {
    public List<Insight> generate(
            List<Transaction> all,
            PlanningWindow w,
            AnalyticsCoverage coverage,
            Summary summary,
            List<GoalProgress> goals) {
        var insights = new ArrayList<Insight>();
        var current = between(all, w.start(), w.cutoff(), w.zone());
        if (summary.budget() != null) {
            var remaining = summary.remainingBudget();
            insights.add(
                    new Insight(
                            id("budget:" + w.month()),
                            "observed",
                            remaining.signum() < 0 ? "review" : "progress",
                            remaining.signum() < 0
                                    ? "Review your chosen limit"
                                    : "Your recorded spending is within your limit",
                            "Recorded spending is ₹"
                                    + summary.spending().toPlainString()
                                    + " against your ₹"
                                    + summary.budget().toPlainString()
                                    + " monthly limit. This does not reserve money for upcoming bills or establish available cash.",
                            evidence(
                                    current.stream().filter(AnalyticsFacts::expense).toList(),
                                    w.zone())));
        }
        var weekEnd = w.cutoff();
        var weekStart = weekEnd.minusDays(6);
        var priorStart = weekStart.minusDays(7);
        if (covered(coverage, priorStart, weekEnd)) {
            var recent = between(all, weekStart, weekEnd, w.zone());
            var before = sum(between(all, priorStart, weekStart.minusDays(1), w.zone()), "expense");
            var now = sum(recent, "expense");
            if (before.signum() > 0 && now.compareTo(before) < 0)
                insights.add(
                        new Insight(
                                id("weekly:" + weekEnd),
                                "observed",
                                "progress",
                                "Your recorded weekly spending decreased",
                                "You recorded ₹"
                                        + money(before.subtract(now)).toPlainString()
                                        + " less during "
                                        + weekStart
                                        + "–"
                                        + weekEnd
                                        + " than in the preceding seven days. Planned or reimbursed purchases may explain the difference; it is not proof of savings.",
                                evidence(recent, w.zone())));
        }
        var recentExpenses =
                between(all, weekStart, weekEnd, w.zone()).stream()
                        .filter(AnalyticsFacts::expense)
                        .sorted(
                                Comparator.comparing((Transaction t) -> t.getAmount().abs())
                                        .reversed())
                        .toList();
        for (var tx : recentExpenses) {
            if (tx.getRecurringScheduleId() != null || tx.getTitle().endsWith(" (Recurring)"))
                continue;
            var previous =
                    between(
                                    all,
                                    date(tx, w.zone()).minusDays(90),
                                    date(tx, w.zone()).minusDays(1),
                                    w.zone())
                            .stream()
                            .filter(AnalyticsFacts::expense)
                            .filter(t -> category(t).equals(category(tx)))
                            .toList();
            if (previous.size() < 5) continue;
            var amounts = previous.stream().map(t -> t.getAmount().abs()).toList();
            var middle = median(amounts);
            var mad = median(amounts.stream().map(a -> a.subtract(middle).abs()).toList());
            var threshold =
                    middle.add(
                            middle.multiply(BigDecimal.valueOf(2))
                                    .max(mad.multiply(new BigDecimal("3"))));
            if (tx.getAmount().abs().compareTo(threshold) > 0
                    && tx.getAmount().abs().subtract(middle).compareTo(new BigDecimal("500"))
                            >= 0) {
                var proof = new ArrayList<Transaction>();
                proof.add(tx);
                proof.addAll(previous.stream().limit(5).toList());
                insights.add(
                        new Insight(
                                id("unusual:" + tx.getId()),
                                "observed",
                                "review",
                                "A larger-than-usual " + category(tx) + " payment",
                                "₹"
                                        + money(tx.getAmount().abs()).toPlainString()
                                        + " compared with a prior-category median of ₹"
                                        + money(middle).toPlainString()
                                        + " across "
                                        + previous.size()
                                        + " recorded payments. This may be planned or necessary; review it if useful.",
                                evidence(proof, w.zone())));
                break;
            }
        }
        goals.stream()
                .filter(g -> g.current().signum() > 0)
                .findFirst()
                .ifPresent(
                        g ->
                                insights.add(
                                        new Insight(
                                                id("goal:" + g.id() + ":" + w.month()),
                                                "observed",
                                                "progress",
                                                "Your " + g.name() + " goal has recorded progress",
                                                "₹"
                                                        + money(g.current()).toPlainString()
                                                        + " recorded toward ₹"
                                                        + money(g.target()).toPlainString()
                                                        + ". This is current goal progress, not a claim about money saved this week.",
                                                List.of())));
        if (insights.isEmpty())
            insights.add(
                    new Insight(
                            id("start:" + w.month()),
                            "observed",
                            "info",
                            "Make your next review useful",
                            "Choose a budget or savings goal, then mark which dates you have fully tracked. You can explore a category scenario without recording income.",
                            List.of()));
        return insights.stream().limit(4).toList();
    }
}
