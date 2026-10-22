package com.expensetracker.features.analytics.application;

import static com.expensetracker.features.analytics.application.AnalyticsFacts.*;

import com.expensetracker.features.analytics.dto.PlanningResponse.*;
import com.expensetracker.features.recurring.domain.RecurringTransaction;
import com.expensetracker.features.transaction.domain.Transaction;
import java.math.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.stereotype.Component;

/** Conservative candidates, never an automatic expense or a claim of subscription usage. */
@Component
public class RecurringPatternDetector {
    public List<Candidate> detect(
            List<Transaction> all, List<RecurringTransaction> schedules, PlanningWindow w) {
        var scheduled = new HashSet<String>();
        schedules.forEach(s -> scheduled.add(key(s.getTitle())));
        Map<String, List<Transaction>> groups = new TreeMap<>();
        between(all, w.cutoff().minusDays(180), w.cutoff(), w.zone()).stream()
                .filter(AnalyticsFacts::expense)
                .filter(t -> t.getRecurringScheduleId() == null)
                .filter(t -> !t.getTitle().endsWith(" (Recurring)"))
                .filter(t -> !scheduled.contains(key(t.getTitle())))
                .forEach(
                        t ->
                                groups.computeIfAbsent(key(t.getTitle()), k -> new ArrayList<>())
                                        .add(t));
        var candidates = new ArrayList<Candidate>();
        for (var entry : groups.entrySet()) {
            var txs =
                    entry.getValue().stream()
                            .sorted(Comparator.comparing(Transaction::getDate))
                            .toList();
            if (txs.size() < 3) continue;
            // Same-day purchases are not separate evidence of a billing interval.
            if (txs.stream().map(t -> date(t, w.zone())).distinct().count() != txs.size()) continue;
            var gaps = new ArrayList<Long>();
            for (int i = 1; i < txs.size(); i++)
                gaps.add(
                        ChronoUnit.DAYS.between(
                                date(txs.get(i - 1), w.zone()), date(txs.get(i), w.zone())));
            String frequency =
                    gaps.stream().allMatch(d -> d >= 6 && d <= 8)
                            ? "weekly"
                            : gaps.stream().allMatch(d -> d >= 26 && d <= 35) ? "monthly" : null;
            if (frequency == null) continue;
            var amounts = txs.stream().map(t -> t.getAmount().abs()).toList();
            var typical = median(amounts);
            if (amounts.stream()
                    .anyMatch(
                            a ->
                                    a.subtract(typical)
                                                    .abs()
                                                    .compareTo(
                                                            typical.multiply(
                                                                    new BigDecimal("0.20")))
                                            > 0)) continue;
            var latest = txs.getLast();
            var lastDate = date(latest, w.zone());
            int anchor =
                    txs.stream().mapToInt(t -> date(t, w.zone()).getDayOfMonth()).max().orElse(1);
            var nextMonth = YearMonth.from(lastDate).plusMonths(1);
            var next =
                    "weekly".equals(frequency)
                            ? lastDate.plusWeeks(1)
                            : nextMonth.atDay(Math.min(anchor, nextMonth.lengthOfMonth()));
            if (!next.isAfter(w.cutoff()))
                continue; // A stale or missed pattern needs more evidence.
            candidates.add(
                    new Candidate(
                            id("recurring:" + entry.getKey() + ":" + frequency),
                            latest.getTitle(),
                            category(latest),
                            money(latest.getAmount().abs()),
                            frequency,
                            next,
                            evidence(txs, w.zone()),
                            txs.stream().map(Transaction::getId).toList()));
        }
        return candidates.stream()
                .sorted(Comparator.comparing(Candidate::nextDate).thenComparing(Candidate::id))
                .limit(10)
                .toList();
    }
}
