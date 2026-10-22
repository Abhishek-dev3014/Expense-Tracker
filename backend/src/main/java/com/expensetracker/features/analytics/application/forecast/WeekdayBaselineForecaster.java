package com.expensetracker.features.analytics.application.forecast;

import static com.expensetracker.features.analytics.application.AnalyticsFacts.*;

import com.expensetracker.features.analytics.application.*;
import com.expensetracker.features.analytics.domain.AnalyticsCoverage;
import com.expensetracker.features.analytics.dto.PlanningResponse.*;
import com.expensetracker.features.recurring.application.RecurringService;
import com.expensetracker.features.recurring.domain.RecurringTransaction;
import com.expensetracker.features.transaction.domain.Transaction;
import com.expensetracker.shared.time.Dates;
import java.math.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class WeekdayBaselineForecaster implements SpendingForecaster {
    public static final String VERSION = "weekday-mean-v1";

    @Override
    public Outlook forecast(
            List<Transaction> history,
            List<RecurringTransaction> schedules,
            AnalyticsCoverage coverage,
            PlanningWindow w) {
        var assumptions =
                new ArrayList<>(
                        List.of(
                                "Statistical spending-pace estimate, not a trained ML forecast or a bank balance.",
                                "Starts tomorrow; today's total includes recorded entries only.",
                                "No calibrated prediction interval is available for this baseline.",
                                "Transfers, refunds and shared reimbursements are not automatically reconciled; confirm tracking only after reviewing them."));
        var bills = new ArrayList<Bill>();
        boolean overdue = false;
        for (var s : schedules) {
            if (!"active".equals(s.getStatus())
                    || !"expense".equals(s.getType())
                    || s.getNextOccurrence() == null) continue;
            var due = s.getNextOccurrence();
            if (!due.atZone(w.zone()).toLocalDate().isAfter(w.today())) {
                overdue = true;
                continue;
            }
            int guard = 0;
            while (!due.atZone(w.zone()).toLocalDate().isAfter(w.end()) && guard++ < 32) {
                String occurrence = RecurringService.occurrenceId(s.getId(), due);
                boolean posted =
                        history.stream()
                                .anyMatch(
                                        t ->
                                                occurrence.equals(t.getId())
                                                        && t.getDate() != null
                                                        && !date(t, w.zone()).isAfter(w.today()));
                if (!posted)
                    bills.add(
                            new Bill(
                                    s.getId(),
                                    s.getTitle(),
                                    due.atZone(w.zone()).toLocalDate(),
                                    money(s.getAmount().abs())));
                due = Dates.next(due, s.getFrequency(), w.zone());
            }
        }
        bills.sort(Comparator.comparing(Bill::date).thenComparing(Bill::title));
        var billTotal =
                money(bills.stream().map(Bill::amount).reduce(BigDecimal.ZERO, BigDecimal::add));
        LocalDate through = w.today().minusDays(1);
        long days =
                coverage == null || coverage.getFrom() == null
                        ? 0
                        : Math.max(
                                0,
                                Math.min(
                                        56,
                                        ChronoUnit.DAYS.between(coverage.getFrom(), through) + 1));
        String status =
                !w.month().equals(YearMonth.from(w.today()))
                        ? "historical"
                        : overdue
                                ? "review_due_bills"
                                : days < 28
                                                || !covered(
                                                        coverage,
                                                        w.today().minusDays(days),
                                                        through)
                                        ? "needs_history"
                                        : "ready";
        var from = through.minusDays(Math.max(days, 1) - 1);
        var observations =
                between(history, from, through, w.zone()).stream()
                        .filter(AnalyticsFacts::expense)
                        .toList();
        if ("ready".equals(status) && observations.size() < 12) status = "needs_history";
        if (!"ready".equals(status))
            return new Outlook(
                    status,
                    "weekday baseline",
                    VERSION,
                    null,
                    null,
                    billTotal,
                    (int) days,
                    assumptions,
                    bills);
        var confirmedSources = new HashSet<String>();
        schedules.stream()
                .filter(s -> "active".equals(s.getStatus()) && "expense".equals(s.getType()))
                .filter(s -> s.getBaselineTransactionIds() != null)
                .forEach(s -> confirmedSources.addAll(s.getBaselineTransactionIds()));
        var daily = new HashMap<LocalDate, BigDecimal>();
        observations.stream()
                .filter(
                        t ->
                                t.getRecurringScheduleId() == null
                                        && !confirmedSources.contains(t.getId())
                                        && !t.getTitle().endsWith(" (Recurring)"))
                .forEach(t -> daily.merge(date(t, w.zone()), t.getAmount().abs(), BigDecimal::add));
        var means = new EnumMap<DayOfWeek, BigDecimal>(DayOfWeek.class);
        for (var weekday : DayOfWeek.values()) {
            var dates =
                    from.datesUntil(through.plusDays(1))
                            .filter(d -> d.getDayOfWeek() == weekday)
                            .toList();
            means.put(
                    weekday,
                    dates.stream()
                            .map(d -> daily.getOrDefault(d, BigDecimal.ZERO))
                            .reduce(BigDecimal.ZERO, BigDecimal::add)
                            .divide(BigDecimal.valueOf(dates.size()), 8, RoundingMode.HALF_UP));
        }
        var variable =
                money(
                        w.today()
                                .plusDays(1)
                                .datesUntil(w.end().plusDays(1))
                                .map(d -> means.get(d.getDayOfWeek()))
                                .reduce(BigDecimal.ZERO, BigDecimal::add));
        var posted = sum(between(history, w.start(), w.cutoff(), w.zone()), "expense");
        assumptions.add(
                "Generated recurring payments and explicitly confirmed source payments are excluded from the variable baseline. Unlinked imported bills may still overlap; review their categories before relying on this estimate.");
        return new Outlook(
                "ready",
                "weekday baseline",
                VERSION,
                money(posted.add(variable).add(billTotal)),
                variable,
                billTotal,
                (int) days,
                assumptions,
                bills);
    }
}
