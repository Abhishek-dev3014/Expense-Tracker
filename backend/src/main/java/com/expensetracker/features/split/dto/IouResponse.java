package com.expensetracker.features.split.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

public record IouResponse(
        String _id, String title, String person, BigDecimal amount, String status, Instant date) {}
