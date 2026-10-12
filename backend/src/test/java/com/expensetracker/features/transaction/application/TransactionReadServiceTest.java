package com.expensetracker.features.transaction.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.expensetracker.features.transaction.domain.Transaction;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import org.junit.jupiter.api.Test;

class TransactionReadServiceTest {
    @Test
    void monetaryTotalsUseExactDecimalsAndExplicitTransactionTypes() {
        var expense = new Transaction();
        expense.setType("expense");
        expense.setAmount(new BigDecimal("0.10"));
        var otherExpense = new Transaction();
        otherExpense.setType("expense");
        otherExpense.setAmount(new BigDecimal("-0.20"));
        var income = new Transaction();
        income.setType("income");
        income.setAmount(new BigDecimal("1.00"));
        var metrics = TransactionReadService.metrics(List.of(expense, otherExpense, income));
        assertThat(metrics.expense()).isEqualByComparingTo("0.30");
        assertThat(metrics.balance()).isEqualByComparingTo("0.70");
    }
}
