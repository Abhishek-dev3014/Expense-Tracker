package com.expensetracker.features.transaction.application;

import com.expensetracker.features.transaction.domain.Transaction;
import com.expensetracker.features.transaction.domain.TransactionMetrics;
import com.expensetracker.features.transaction.dto.CategorySpending;
import com.expensetracker.features.transaction.infrastructure.TransactionQueries;
import com.expensetracker.features.transaction.infrastructure.TransactionRepository;
import com.expensetracker.shared.time.Dates;
import java.math.*;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TransactionReadService {
    private final TransactionRepository transactions;
    private final TransactionQueries queries;
    private final Clock clock;

    public List<Transaction> all(String user) {
        return transactions.findByUserOrderByDateDesc(user);
    }

    public long count(String user) {
        return transactions.countByUser(user);
    }

    public static TransactionMetrics metrics(List<Transaction> txs) {
        BigDecimal income = BigDecimal.ZERO, expense = BigDecimal.ZERO;
        for (var tx : txs) {
            if ("income".equals(tx.getType())) income = income.add(tx.getAmount().abs());
            else if ("expense".equals(tx.getType())) expense = expense.add(tx.getAmount().abs());
        }
        return new TransactionMetrics(income, expense, income.subtract(expense), txs.size());
    }

    public static List<CategorySpending> breakdown(List<Transaction> txs) {
        Map<String, BigDecimal> amounts = new HashMap<>();
        txs.stream()
                .filter(tx -> "expense".equals(tx.getType()))
                .forEach(
                        tx ->
                                amounts.merge(
                                        tx.getCategory() == null || tx.getCategory().isBlank()
                                                ? "Other"
                                                : tx.getCategory(),
                                        tx.getAmount().abs(),
                                        BigDecimal::add));
        return amounts.entrySet().stream()
                .map(e -> new CategorySpending(e.getKey(), e.getValue()))
                .sorted(Comparator.comparing(CategorySpending::amount).reversed())
                .toList();
    }

    public List<Transaction> month(String user, YearMonth month) {
        return queries.inMonth(
                user,
                Dates.start(month, clock.getZone()),
                Dates.start(month.plusMonths(1), clock.getZone()));
    }
}
