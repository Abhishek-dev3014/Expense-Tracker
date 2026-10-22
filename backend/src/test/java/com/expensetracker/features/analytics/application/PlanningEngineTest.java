package com.expensetracker.features.analytics.application;

import static com.expensetracker.features.analytics.application.AnalyticsFacts.*;
import static org.assertj.core.api.Assertions.*;

import com.expensetracker.features.analytics.application.forecast.WeekdayBaselineForecaster;
import com.expensetracker.features.analytics.domain.AnalyticsCoverage;
import com.expensetracker.features.recurring.domain.RecurringTransaction;
import com.expensetracker.features.transaction.domain.Transaction;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class PlanningEngineTest {
    final Clock clock = Clock.fixed(Instant.parse("2026-10-22T08:00:00Z"), ZoneOffset.UTC);
    final PlanningWindow window = PlanningWindow.of(null, clock);

    Transaction tx(LocalDate day, String title, String amount) {
        var t = new Transaction();
        t.setId(UUID.randomUUID().toString());
        t.setTitle(title);
        t.setType("expense");
        t.setCategory("Food");
        t.setAmount(new BigDecimal(amount).negate());
        t.setDate(day.atStartOfDay(ZoneOffset.UTC).toInstant());
        return t;
    }

    AnalyticsCoverage coverage(LocalDate start, LocalDate end) {
        var c = new AnalyticsCoverage();
        c.setFrom(start);
        c.setThrough(end);
        return c;
    }

    List<Transaction> history() {
        return window.today()
                .minusDays(56)
                .datesUntil(window.today().plusDays(1))
                .map(d -> tx(d, "Lunch", "100"))
                .toList();
    }

    @Test
    void requiresExplicitCompleteHistoryRatherThanTreatingMissingDaysAsZero() {
        var method = new WeekdayBaselineForecaster();
        assertThat(method.forecast(history(), List.of(), null, window).status())
                .isEqualTo("needs_history");
        assertThat(
                        method.forecast(
                                        history(),
                                        List.of(),
                                        coverage(
                                                window.today().minusDays(56),
                                                window.today().minusDays(2)),
                                        window)
                                .projectedSpending())
                .isNull();
    }

    @Test
    void projectsVariableSpendingAndConfirmedBillsWithoutInventingAnInterval() {
        var bill = new RecurringTransaction();
        bill.setId("bill");
        bill.setTitle("Rent");
        bill.setType("expense");
        bill.setAmount(new BigDecimal("500"));
        bill.setFrequency("monthly");
        bill.setNextOccurrence(Instant.parse("2026-10-25T00:00:00Z"));
        var result =
                new WeekdayBaselineForecaster()
                        .forecast(
                                history(),
                                List.of(bill),
                                coverage(window.today().minusDays(56), window.today()),
                                window);
        assertThat(result.status()).isEqualTo("ready");
        assertThat(result.projectedSpending()).isEqualByComparingTo("3600");
        assertThat(result.remainingVariable()).isEqualByComparingTo("900");
        assertThat(result.upcomingBills()).isEqualByComparingTo("500");
        assertThat(result.assumptions())
                .anyMatch(s -> s.contains("No calibrated prediction interval"));
    }

    @Test
    void excludesGeneratedRecurringPaymentsFromVariableBaselineAndBlocksOverdueSchedules() {
        var history = new ArrayList<>(history());
        var generated = tx(window.today().minusDays(7), "Rent (Recurring)", "5000");
        generated.setRecurringScheduleId("rent");
        history.add(generated);
        var c = coverage(window.today().minusDays(56), window.today());
        assertThat(
                        new WeekdayBaselineForecaster()
                                .forecast(history, List.of(), c, window)
                                .remainingVariable())
                .isEqualByComparingTo("900");
        var overdue = new RecurringTransaction();
        overdue.setType("expense");
        overdue.setAmount(BigDecimal.ONE);
        overdue.setNextOccurrence(clock.instant().minusSeconds(86400));
        assertThat(
                        new WeekdayBaselineForecaster()
                                .forecast(history, List.of(overdue), c, window)
                                .status())
                .isEqualTo("review_due_bills");
    }

    @Test
    void confirmedSourceIdsPreventDoubleCountingWithoutExcludingAnEntireMerchant() {
        var rows = new ArrayList<>(history());
        var sources = new ArrayList<String>();
        for (int i = 0; i < 8; i++) {
            var payment = tx(window.today().minusWeeks(i), "Music club", "700");
            rows.add(payment);
            sources.add(payment.getId());
        }
        var bill = new RecurringTransaction();
        bill.setId("club");
        bill.setTitle("Music club");
        bill.setType("expense");
        bill.setAmount(new BigDecimal("700"));
        bill.setFrequency("weekly");
        bill.setNextOccurrence(window.today().plusWeeks(1).atStartOfDay(window.zone()).toInstant());
        bill.setBaselineTransactionIds(sources);
        var c = coverage(window.today().minusDays(56), window.today());
        var method = new WeekdayBaselineForecaster();
        var result = method.forecast(rows, List.of(bill), c, window);
        assertThat(result.remainingVariable()).isEqualByComparingTo("900");
        assertThat(result.upcomingBills()).isEqualByComparingTo("700");
        assertThat(result.projectedSpending()).isEqualByComparingTo("6600");
        // An unrelated purchase with the same description remains variable spending.
        rows.add(tx(window.today().minusWeeks(1), "Music club", "700"));
        assertThat(method.forecast(rows, List.of(bill), c, window).remainingVariable())
                .isEqualByComparingTo("987.50");
    }

    @Test
    void completedMonthHasNoFutureForecastAndUsesWholePriorMonth() {
        var w = PlanningWindow.of("2026-02", clock);
        assertThat(w.previousCutoff()).isEqualTo(LocalDate.parse("2026-01-31"));
        assertThat(new WeekdayBaselineForecaster().forecast(history(), List.of(), null, w).status())
                .isEqualTo("historical");
        var january = PlanningWindow.of("2026-01", clock);
        assertThat(january.previousCutoff()).isEqualTo(LocalDate.parse("2025-12-31"));
    }

    @Test
    void rejectsFutureOrMalformedPeriods() {
        assertThatThrownBy(() -> PlanningWindow.of("2027-01", clock))
                .hasMessageContaining("Choose");
        assertThatThrownBy(() -> PlanningWindow.of("Oct", clock)).hasMessageContaining("YYYY-MM");
    }

    @Test
    void recurringCandidatesNeedIndependentDatesAndExplicitConfirmation() {
        var payments =
                List.of(
                        tx(LocalDate.parse("2026-08-25"), "Internet", "799"),
                        tx(LocalDate.parse("2026-09-25"), "Internet", "799"),
                        tx(LocalDate.parse("2026-10-25"), "Internet", "799"));
        // A future entry must not provide the third observation.
        assertThat(new RecurringPatternDetector().detect(payments, List.of(), window)).isEmpty();
        var w =
                PlanningWindow.of(
                        null, Clock.fixed(Instant.parse("2026-10-26T00:00:00Z"), ZoneOffset.UTC));
        var result = new RecurringPatternDetector().detect(payments, List.of(), w);
        assertThat(result).hasSize(1);
        assertThat(result.getFirst().nextDate()).isEqualTo(LocalDate.parse("2026-11-25"));
        assertThat(result.getFirst().evidence()).hasSize(3);
        var scheduled = new RecurringTransaction();
        scheduled.setTitle("INTERNET");
        assertThat(new RecurringPatternDetector().detect(payments, List.of(scheduled), w))
                .isEmpty();
    }

    @Test
    void monthEndRecurrencePreservesTheObservedAnchor() {
        var rows =
                List.of(
                        tx(LocalDate.parse("2026-02-28"), "Rent", "5000"),
                        tx(LocalDate.parse("2026-03-31"), "Rent", "5000"),
                        tx(LocalDate.parse("2026-04-30"), "Rent", "5000"));
        var w =
                PlanningWindow.of(
                        null, Clock.fixed(Instant.parse("2026-05-01T00:00:00Z"), ZoneOffset.UTC));
        assertThat(new RecurringPatternDetector().detect(rows, List.of(), w).getFirst().nextDate())
                .isEqualTo(LocalDate.parse("2026-05-31"));
    }

    @Test
    void accountingUsesExplicitTypeAndLocalCalendarBoundaries() {
        var atBoundary = tx(LocalDate.parse("2026-09-30"), "Lunch", "100");
        atBoundary.setDate(Instant.parse("2026-09-30T20:00:00Z"));
        var zone = ZoneId.of("Asia/Kolkata");
        assertThat(
                        between(
                                List.of(atBoundary),
                                LocalDate.parse("2026-10-01"),
                                LocalDate.parse("2026-10-01"),
                                zone))
                .hasSize(1);
        atBoundary.setType("income");
        assertThat(sum(List.of(atBoundary), "expense")).isEqualByComparingTo("0");
    }
}
