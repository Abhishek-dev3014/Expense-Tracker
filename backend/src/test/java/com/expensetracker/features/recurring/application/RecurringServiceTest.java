package com.expensetracker.features.recurring.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.time.*;
import org.junit.jupiter.api.Test;

class RecurringServiceTest {
    @Test
    void recurringIdsAreStablePerOccurrenceAndDistinctBetweenSchedules() {
        var occurrence = Instant.parse("2026-01-01T00:00:00Z");
        var id = RecurringService.occurrenceId("507f1f77bcf86cd799439011", occurrence);
        assertThat(id).matches("[0-9a-f]{24}");
        assertThat(id)
                .isEqualTo(RecurringService.occurrenceId("507f1f77bcf86cd799439011", occurrence));
        assertThat(id)
                .isNotEqualTo(
                        RecurringService.occurrenceId("507f1f77bcf86cd799439012", occurrence));
        assertThat(id)
                .isNotEqualTo(
                        RecurringService.occurrenceId(
                                "507f1f77bcf86cd799439011", occurrence.plusSeconds(1)));
    }
}
