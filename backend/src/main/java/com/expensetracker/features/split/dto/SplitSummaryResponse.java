package com.expensetracker.features.split.dto;

import java.util.*;

public record SplitSummaryResponse(List<DebtResponse> debts, List<IouResponse> ious) {}
