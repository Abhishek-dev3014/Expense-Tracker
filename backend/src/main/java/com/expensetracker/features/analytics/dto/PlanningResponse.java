package com.expensetracker.features.analytics.dto;

import java.math.BigDecimal;
import java.time.*;
import java.util.List;

public record PlanningResponse(
        String version,
        String month,
        String timezone,
        LocalDate asOf,
        LocalDate periodEnd,
        Summary summary,
        Coverage coverage,
        List<Day> days,
        List<Category> categories,
        Outlook outlook,
        List<Candidate> recurringCandidates,
        List<Insight> insights,
        List<GoalProgress> goals,
        List<String> limitations) {
    public record Summary(
            BigDecimal income,
            BigDecimal spending,
            BigDecimal netCashFlow,
            BigDecimal savingsRate,
            BigDecimal budget,
            BigDecimal remainingBudget,
            BigDecimal previousSpending,
            BigDecimal changePercent,
            boolean comparisonReady) {}

    public record Coverage(
            LocalDate from, LocalDate through, LocalDate firstRecord, boolean periodComplete) {}

    public record Day(LocalDate date, BigDecimal spending, BigDecimal income) {}

    public record Category(String name, BigDecimal amount, int count) {}

    public record Evidence(
            String id, String description, BigDecimal amount, LocalDate date, String category) {}

    public record Outlook(
            String status,
            String method,
            String methodVersion,
            BigDecimal projectedSpending,
            BigDecimal remainingVariable,
            BigDecimal upcomingBills,
            int historyDays,
            List<String> assumptions,
            List<Bill> bills) {}

    public record Bill(String id, String title, LocalDate date, BigDecimal amount) {}

    public record Candidate(
            String id,
            String title,
            String category,
            BigDecimal amount,
            String frequency,
            LocalDate nextDate,
            List<Evidence> evidence,
            @com.fasterxml.jackson.annotation.JsonIgnore List<String> sourceTransactionIds) {}

    public record Insight(
            String id,
            String kind,
            String tone,
            String title,
            String message,
            List<Evidence> evidence) {}

    public record GoalProgress(
            String id, String name, BigDecimal current, BigDecimal target, BigDecimal percent) {}
}
