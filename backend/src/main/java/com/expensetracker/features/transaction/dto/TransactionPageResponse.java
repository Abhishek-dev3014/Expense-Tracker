package com.expensetracker.features.transaction.dto;

import com.expensetracker.features.transaction.domain.Transaction;
import java.util.*;

public record TransactionPageResponse(
        List<Transaction> transactions, long total, int page, int totalPages) {}
