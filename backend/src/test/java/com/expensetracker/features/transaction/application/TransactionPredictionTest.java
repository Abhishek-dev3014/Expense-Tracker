package com.expensetracker.features.transaction.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.expensetracker.features.category.application.CategoryRuleService;
import com.expensetracker.features.transaction.domain.Transaction;
import com.expensetracker.features.transaction.dto.CreateTransactionRequest;
import com.expensetracker.features.transaction.dto.ImportTransactionsRequest;
import com.expensetracker.features.transaction.infrastructure.TransactionRepository;
import com.expensetracker.integrations.ml.CategoryPredictionClient;
import java.math.BigDecimal;
import java.time.Clock;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class TransactionPredictionTest {
    private CreateTransactionRequest expense(String title, String category) {
        return new CreateTransactionRequest(
                title, new BigDecimal("120"), category, "2026-10-17", "expense");
    }

    @Test
    void memoryFailureDoesNotReportASavedExpenseAsFailedOrRepeatTheFinancialWrite() {
        var repo = mock(TransactionRepository.class);
        var predictor = mock(CategoryPredictionClient.class);
        var rules = mock(CategoryRuleService.class);
        when(repo.insert(any(Transaction.class))).thenAnswer(call -> call.getArgument(0));
        when(rules.remember("owner", "Uber", "Transport"))
                .thenThrow(
                        new org.springframework.dao.DataAccessResourceFailureException(
                                "test failure"));
        var service = new TransactionService(repo, null, predictor, Clock.systemUTC(), rules);
        var result =
                service.create(
                        "owner",
                        "expense",
                        new CreateTransactionRequest(
                                "Uber",
                                new BigDecimal("120"),
                                "Transport",
                                "2026-10-21",
                                "expense",
                                true));
        assertThat(result.getCategory()).isEqualTo("Transport");
        assertThat(result.getCategoryRuleSaved()).isFalse();
        verify(repo, times(1)).insert(any(Transaction.class));
        verifyNoInteractions(predictor);
    }

    @Test
    void ordinaryExpenseStoresCategoryConfidenceAndPredictionStatus() {
        var repo = mock(TransactionRepository.class);
        var predictor = mock(CategoryPredictionClient.class);
        when(predictor.predict("uber travel"))
                .thenReturn(
                        new CategoryPredictionClient.Prediction("Transport", 0.95, "predicted"));
        when(repo.insert(any(Transaction.class))).thenAnswer(call -> call.getArgument(0));
        var service =
                new TransactionService(
                        repo, null, predictor, Clock.systemUTC(), mock(CategoryRuleService.class));
        var result = service.create("owner", "expense", expense("uber travel", ""));
        assertThat(result.getCategory()).isEqualTo("Transport");
        assertThat(result.getAiConfidence()).isEqualTo(0.95);
        assertThat(result.getCategoryStatus()).isEqualTo("predicted");
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void importPredictsUncategorizedExpensesOnceAndPreservesIncomeAndManualChoices() {
        var repo = mock(TransactionRepository.class);
        var predictor = mock(CategoryPredictionClient.class);
        when(predictor.predictAll(List.of("Uber ride", "Coffee")))
                .thenReturn(
                        List.of(
                                new CategoryPredictionClient.Prediction(
                                        "Transport", 0.95, "predicted"),
                                new CategoryPredictionClient.Prediction("Food", 0.9, "predicted")));
        var service =
                new TransactionService(
                        repo, null, predictor, Clock.systemUTC(), mock(CategoryRuleService.class));
        var income =
                new CreateTransactionRequest(
                        "Salary", new BigDecimal("5000"), null, "2026-10-17", "income");
        int count =
                service.batch(
                        "owner",
                        new ImportTransactionsRequest(
                                List.of(
                                        expense("Uber ride", ""),
                                        income,
                                        expense("Uber ride", null),
                                        expense("Manual entry", "General"),
                                        expense("Coffee", ""))));
        var captured = ArgumentCaptor.forClass(List.class);
        verify(repo).insert(captured.capture());
        List<Transaction> saved = captured.getValue();
        assertThat(count).isEqualTo(5);
        assertThat(saved)
                .extracting(Transaction::getCategory)
                .containsExactly("Transport", "Income", "Transport", "General", "Food");
        assertThat(saved).allMatch(tx -> tx.getUser().equals("owner"));
        assertThat(saved.get(2).getAiConfidence()).isEqualTo(0.95);
        assertThat(saved.get(3).getCategoryStatus()).isEqualTo("manual");
        verify(predictor).predictAll(List.of("Uber ride", "Coffee"));
        verifyNoMoreInteractions(predictor);
    }
}
