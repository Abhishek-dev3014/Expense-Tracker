package com.expensetracker.features.analytics.application;

import com.expensetracker.shared.error.ApiException;
import java.time.*;

public record PlanningWindow(YearMonth month, LocalDate today, ZoneId zone) {
    public static PlanningWindow of(String value, Clock clock) {
        var today = LocalDate.now(clock);
        try {
            var month = value == null ? YearMonth.from(today) : YearMonth.parse(value);
            if (month.isAfter(YearMonth.from(today)) || month.getYear() < 2000)
                throw ApiException.badRequest("Choose a recorded month between 2000 and today.");
            return new PlanningWindow(month, today, clock.getZone());
        } catch (DateTimeException e) {
            throw ApiException.badRequest("Choose a month in YYYY-MM format.");
        }
    }

    public LocalDate start() {
        return month.atDay(1);
    }

    public LocalDate end() {
        return month.atEndOfMonth();
    }

    public LocalDate cutoff() {
        return end().isBefore(today) ? end() : today;
    }

    public LocalDate previousCutoff() {
        var previous = month.minusMonths(1);
        return end().isBefore(today)
                ? previous.atEndOfMonth()
                : previous.atDay(Math.min(cutoff().getDayOfMonth(), previous.lengthOfMonth()));
    }
}
