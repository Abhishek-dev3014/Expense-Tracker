package com.expensetracker.features.transaction.domain;

import java.time.Instant;

/** Original suggestion and explicit correction are saved atomically with the expense. */
public record CategoryCorrection(
        String previousCategory,
        String category,
        String description,
        String previousStatus,
        double previousConfidence,
        Instant correctedAt) {}
