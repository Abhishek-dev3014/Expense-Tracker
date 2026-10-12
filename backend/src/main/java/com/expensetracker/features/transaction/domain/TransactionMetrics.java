package com.expensetracker.features.transaction.domain;

import java.math.BigDecimal;
import java.util.*;

public record TransactionMetrics(
        BigDecimal income, BigDecimal expense, BigDecimal balance, int count) {}
