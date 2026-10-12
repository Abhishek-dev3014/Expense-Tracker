package com.expensetracker.shared.time;

import com.expensetracker.shared.error.ApiException;
import java.time.*;
import java.time.format.DateTimeParseException;

public final class Dates {
    private Dates() {}

    public static Instant parse(String value, Instant fallback) {
        if (value == null || value.isBlank()) return fallback;
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException e) {
            try {
                return LocalDate.parse(value).atStartOfDay(ZoneOffset.UTC).toInstant();
            } catch (DateTimeParseException ignored) {
                throw ApiException.badRequest("Use an ISO date or timestamp.");
            }
        }
    }

    public static Instant start(YearMonth month, ZoneId zone) {
        return month.atDay(1).atStartOfDay(zone).toInstant();
    }

    public static Instant next(Instant date, String frequency, ZoneId zone) {
        var local = date.atZone(zone);
        return switch (frequency) {
            case "daily" -> local.plusDays(1).toInstant();
            case "weekly" -> local.plusWeeks(1).toInstant();
            case "monthly" -> local.plusMonths(1).toInstant();
            case "yearly" -> local.plusYears(1).toInstant();
            default -> throw ApiException.badRequest("Invalid recurring frequency.");
        };
    }
}
