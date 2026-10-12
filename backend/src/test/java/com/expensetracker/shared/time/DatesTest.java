package com.expensetracker.shared.time;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.expensetracker.shared.error.ApiException;
import java.time.*;
import org.junit.jupiter.api.Test;

class DatesTest {
    @Test
    void recurrenceClampsMonthEndsAndLeapYears() {
        assertThat(Dates.next(Instant.parse("2024-01-31T12:00:00Z"), "monthly", ZoneOffset.UTC))
                .isEqualTo(Instant.parse("2024-02-29T12:00:00Z"));
        assertThat(Dates.next(Instant.parse("2024-02-29T12:00:00Z"), "yearly", ZoneOffset.UTC))
                .isEqualTo(Instant.parse("2025-02-28T12:00:00Z"));
        assertThatThrownBy(() -> Dates.next(Instant.now(), "invalid", ZoneOffset.UTC))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void monthBoundariesUseConfiguredZoneWithoutLosingFinalDay() {
        var zone = ZoneId.of("Asia/Kolkata");
        assertThat(Dates.start(YearMonth.of(2026, 1), zone))
                .isEqualTo(Instant.parse("2025-12-31T18:30:00Z"));
        assertThat(Dates.start(YearMonth.of(2026, 2), zone))
                .isEqualTo(Instant.parse("2026-01-31T18:30:00Z"));
    }
}
