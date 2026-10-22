package com.expensetracker.features.analytics.application;

import static com.expensetracker.features.analytics.application.AnalyticsFacts.*;

import com.expensetracker.features.analytics.application.forecast.SpendingForecaster;
import com.expensetracker.features.analytics.domain.*;
import com.expensetracker.features.analytics.dto.PlanningRequests;
import com.expensetracker.features.analytics.dto.PlanningResponse;
import com.expensetracker.features.analytics.dto.PlanningResponse.*;
import com.expensetracker.features.analytics.infrastructure.*;
import com.expensetracker.features.budget.application.BudgetService;
import com.expensetracker.features.goal.application.GoalService;
import com.expensetracker.features.recurring.application.RecurringService;
import com.expensetracker.features.recurring.domain.RecurringTransaction;
import com.expensetracker.features.recurring.dto.CreateRecurringRequest;
import com.expensetracker.features.transaction.application.TransactionReadService;
import com.expensetracker.shared.error.ApiException;
import java.math.*;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AnalyticsPlanningService {
    private final TransactionReadService transactions;
    private final BudgetService budgets;
    private final GoalService goals;
    private final RecurringService recurring;
    private final AnalyticsCoverageRepository coverageRepository;
    private final InsightFeedbackRepository feedbackRepository;
    private final SpendingForecaster forecaster;
    private final RecurringPatternDetector detector;
    private final SpendingInsightEngine insightEngine;
    private final Clock clock;

    public PlanningResponse summary(String user, String month) {
        return build(user, month, true);
    }

    private PlanningResponse build(String user, String month, boolean filterFeedback) {
        var w = PlanningWindow.of(month, clock);
        var all =
                transactions.range(
                        user,
                        w.cutoff().minusDays(180).atStartOfDay(w.zone()).toInstant(),
                        w.cutoff().plusDays(1).atStartOfDay(w.zone()).toInstant());
        var current = between(all, w.start(), w.cutoff(), w.zone());
        var coverage = coverageRepository.findById(user).orElse(null);
        var previous =
                between(all, w.month().minusMonths(1).atDay(1), w.previousCutoff(), w.zone());
        boolean comparable = covered(coverage, w.month().minusMonths(1).atDay(1), w.cutoff());
        var income = sum(current, "income");
        var spending = sum(current, "expense");
        var net = money(income.subtract(spending));
        var before = sum(previous, "expense");
        var limit = budgets.find(user, w.month()).map(b -> b.getMonthlyLimit()).orElse(null);
        var summary =
                new Summary(
                        income,
                        spending,
                        net,
                        income.signum() > 0
                                ? net.multiply(new BigDecimal("100"))
                                        .divide(income, 1, RoundingMode.HALF_UP)
                                : null,
                        limit,
                        limit == null ? null : money(limit.subtract(spending)),
                        before,
                        comparable && before.signum() > 0
                                ? spending.subtract(before)
                                        .multiply(new BigDecimal("100"))
                                        .divide(before, 1, RoundingMode.HALF_UP)
                                : null,
                        comparable);
        var days =
                w.start()
                        .datesUntil(w.cutoff().plusDays(1))
                        .map(
                                d -> {
                                    var day = between(current, d, d, w.zone());
                                    boolean known = !day.isEmpty() || covered(coverage, d, d);
                                    return new Day(
                                            d,
                                            known ? sum(day, "expense") : null,
                                            known ? sum(day, "income") : null);
                                })
                        .toList();
        var goalProgress =
                goals.list(user).stream()
                        .filter(
                                g ->
                                        "active".equals(g.getStatus())
                                                && g.getTargetAmount().signum() > 0)
                        .map(
                                g ->
                                        new GoalProgress(
                                                g.getId(),
                                                g.getName(),
                                                g.getCurrentAmount(),
                                                g.getTargetAmount(),
                                                g.getCurrentAmount()
                                                        .multiply(new BigDecimal("100"))
                                                        .divide(
                                                                g.getTargetAmount(),
                                                                1,
                                                                RoundingMode.HALF_UP)))
                        .toList();
        var schedules = recurring.list(user);
        var insights = insightEngine.generate(all, w, coverage, summary, goalProgress);
        if (filterFeedback) {
            var hidden = new HashSet<String>();
            feedbackRepository
                    .findAllById(
                            insights.stream()
                                    .map(i -> id(user + ":" + w.month() + ":" + i.id()))
                                    .toList())
                    .stream()
                    .filter(
                            f ->
                                    user.equals(f.getUser())
                                            && w.month().toString().equals(f.getMonth()))
                    .filter(f -> !"helpful".equals(f.getResponse()))
                    .forEach(f -> hidden.add(f.getInsightId()));
            insights = insights.stream().filter(i -> !hidden.contains(i.id())).toList();
        }
        LocalDate first =
                all.stream()
                        .filter(t -> t.getDate() != null && !date(t, w.zone()).isAfter(w.cutoff()))
                        .map(t -> date(t, w.zone()))
                        .min(LocalDate::compareTo)
                        .orElse(null);
        return new PlanningResponse(
                "planning-v1",
                w.month().toString(),
                w.zone().getId(),
                w.today(),
                w.cutoff(),
                summary,
                new Coverage(
                        coverage == null ? null : coverage.getFrom(),
                        coverage == null ? null : coverage.getThrough(),
                        first,
                        covered(coverage, w.start(), w.cutoff())),
                days,
                categories(current),
                forecaster.forecast(all, schedules, coverage, w),
                detector.detect(all, schedules, w),
                insights,
                goalProgress,
                List.of(
                        "Based on recorded INR entries; this is not a bank balance or verified savings.",
                        "Transfers, refunds, imported duplicate bills and shared reimbursements require review before relying on projections.",
                        "Historical forecasts are not reconstructed; historical months show recorded facts only."));
    }

    public AnalyticsCoverage coverage(String user, PlanningRequests.Coverage input) {
        var today = LocalDate.now(clock);
        if (input.from().isAfter(input.through())
                || input.through().isAfter(today)
                || input.from().getYear() < 2000)
            throw ApiException.badRequest(
                    "Confirm a valid tracked date range ending no later than today.");
        var profile = new AnalyticsCoverage();
        profile.setId(user);
        profile.setFrom(input.from());
        profile.setThrough(input.through());
        return coverageRepository.save(profile);
    }

    public void clearCoverage(String user) {
        coverageRepository.deleteById(user);
    }

    public PlanningRequests.ScenarioResult scenario(String user, PlanningRequests.Scenario input) {
        var w = PlanningWindow.of(input.month(), clock);
        var category =
                categories(
                                transactions.range(
                                        user,
                                        w.start().atStartOfDay(w.zone()).toInstant(),
                                        w.cutoff().plusDays(1).atStartOfDay(w.zone()).toInstant()))
                        .stream()
                        .filter(c -> c.name().equals(input.category()))
                        .findFirst()
                        .orElseThrow(
                                () ->
                                        ApiException.badRequest(
                                                "Choose a category recorded in this period."));
        var reduction =
                money(
                        category.amount()
                                .multiply(input.reductionPercent())
                                .divide(new BigDecimal("100")));
        PlanningRequests.GoalImpact impact = null;
        if (input.goalId() != null) {
            var goal =
                    goals.list(user).stream()
                            .filter(
                                    g ->
                                            input.goalId().equals(g.getId())
                                                    && !"cancelled".equals(g.getStatus()))
                            .findFirst()
                            .orElseThrow(() -> ApiException.notFound("Goal"));
            var remaining =
                    money(
                            goal.getTargetAmount()
                                    .subtract(goal.getCurrentAmount())
                                    .max(BigDecimal.ZERO));
            var contribution = reduction.min(remaining);
            impact =
                    new PlanningRequests.GoalImpact(
                            goal.getId(),
                            goal.getName(),
                            remaining,
                            money(remaining.subtract(contribution)),
                            contribution);
        }
        return new PlanningRequests.ScenarioResult(
                "scenario",
                w.month().toString(),
                category.name(),
                category.amount(),
                input.reductionPercent(),
                reduction,
                money(category.amount().subtract(reduction)),
                "An editable reduction of recorded category spending over this same period, not achieved savings or a future monthly forecast. Substitution costs are not included.",
                impact);
    }

    public void feedback(String user, String insightId, PlanningRequests.Feedback input) {
        var data = build(user, input.month(), false);
        if (data.insights().stream().noneMatch(i -> i.id().equals(insightId)))
            throw ApiException.notFound("Insight");
        var record = new InsightFeedback();
        record.setId(id(user + ":" + input.month() + ":" + insightId));
        record.setUser(user);
        record.setMonth(input.month());
        record.setInsightId(insightId);
        record.setResponse(input.response());
        record.setUpdatedAt(clock.instant());
        feedbackRepository.save(record);
    }

    public RecurringTransaction confirm(
            String user, String candidateId, PlanningRequests.Confirm input) {
        var data = build(user, input.month(), false);
        if (!data.month().equals(YearMonth.now(clock).toString()))
            throw ApiException.badRequest("Confirm recurring candidates from the current month.");
        var candidate =
                data.recurringCandidates().stream()
                        .filter(c -> c.id().equals(candidateId))
                        .findFirst()
                        .orElse(null);
        // A retry after success must not create a second schedule, even though detection now hides
        // it.
        String expectedId = RecurringService.occurrenceId(user + ":" + candidateId, Instant.EPOCH);
        if (candidate == null)
            return recurring.list(user).stream()
                    .filter(s -> expectedId.equals(s.getId()))
                    .findFirst()
                    .orElseThrow(() -> ApiException.notFound("Recurring candidate"));
        return recurring.confirmDetected(
                user,
                candidate.id(),
                new CreateRecurringRequest(
                        candidate.title(),
                        candidate.amount(),
                        candidate.category(),
                        "expense",
                        candidate.frequency(),
                        candidate.nextDate().toString()),
                candidate.sourceTransactionIds());
    }
}
