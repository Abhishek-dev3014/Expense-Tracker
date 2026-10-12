package com.expensetracker.features.transaction.dto;

import java.math.BigDecimal;
import java.util.*;

public record CategorySpending(String category, BigDecimal amount) {}
