package com.expensetracker.features.budget.dto;

import com.expensetracker.features.budget.domain.Budget;
import java.math.BigDecimal;
import java.util.*;

public record BudgetUsageResponse(Budget budget, BigDecimal used, BigDecimal remaining) {}
