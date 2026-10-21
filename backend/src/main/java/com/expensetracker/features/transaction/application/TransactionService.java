package com.expensetracker.features.transaction.application;

import com.expensetracker.features.category.application.CategoryRuleService;
import com.expensetracker.features.transaction.domain.CategoryCorrection;
import com.expensetracker.features.transaction.domain.SplitDetail;
import com.expensetracker.features.transaction.domain.Transaction;
import com.expensetracker.features.transaction.dto.CreateTransactionRequest;
import com.expensetracker.features.transaction.dto.ImportTransactionsRequest;
import com.expensetracker.features.transaction.dto.TransactionPageResponse;
import com.expensetracker.features.transaction.infrastructure.TransactionQueries;
import com.expensetracker.features.transaction.infrastructure.TransactionRepository;
import com.expensetracker.integrations.ml.CategoryPredictionClient;
import com.expensetracker.shared.error.ApiException;
import com.expensetracker.shared.time.Dates;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService {
    private final TransactionRepository transactions;
    private final TransactionQueries queries;
    private final CategoryPredictionClient prediction;
    private final Clock clock;
    private final CategoryRuleService categoryRules;

    public Transaction create(String user, String type, CreateTransactionRequest input) {
        validateRemember(user, type, input);
        var tx = make(user, type, input);
        if ("expense".equals(type) && (input.category() == null || input.category().isBlank())) {
            categorize(user, tx);
        }
        return rememberAfterSave(user, transactions.insert(tx), input);
    }

    private void categorize(String user, Transaction tx) {
        var remembered = categoryRules.match(user, tx.getTitle());
        if (remembered.isPresent()) {
            tx.setCategory(remembered.get());
            tx.setCategoryStatus("remembered");
            tx.setAiConfidence(0); // A confirmed rule is not a model probability.
        } else {
            var result = prediction.predict(tx.getTitle());
            tx.setCategory(result.category());
            tx.setAiConfidence(result.confidence());
            tx.setCategoryStatus(result.status());
        }
    }

    private void validateRemember(String user, String type, CreateTransactionRequest input) {
        if (!Boolean.TRUE.equals(input.rememberCategory())) return;
        if (!"expense".equals(type))
            throw ApiException.badRequest("Category memory is available for expenses only.");
        categoryRules.validate(user, input.title(), input.category());
    }

    private Transaction rememberAfterSave(
            String user, Transaction saved, CreateTransactionRequest input) {
        if (!Boolean.TRUE.equals(input.rememberCategory())) return saved;
        try {
            categoryRules.remember(user, saved.getTitle(), saved.getCategory());
            saved.setCategoryRuleSaved(true);
        } catch (DataAccessException e) {
            // Do not turn a successful financial save into a retry that duplicates the expense.
            saved.setCategoryRuleSaved(false);
            log.warn(
                    "Expense saved but category memory could not be saved: {}",
                    e.getClass().getSimpleName());
        }
        return saved;
    }

    private Transaction make(String user, String type, CreateTransactionRequest input) {
        if (!List.of("income", "expense").contains(type == null ? "" : type))
            throw ApiException.badRequest("Choose income or expense.");
        var tx = new Transaction();
        tx.setUser(user);
        tx.setTitle(input.title().strip());
        tx.setType(type);
        tx.setAmount("expense".equals(type) ? input.amount().abs().negate() : input.amount().abs());
        tx.setCategory(
                input.category() == null || input.category().isBlank()
                        ? ("income".equals(type) ? "Income" : "General")
                        : input.category().strip());
        tx.setDate(Dates.parse(input.date(), clock.instant()));
        return tx;
    }

    public int batch(String user, ImportTransactionsRequest input) {
        if (input.transactions().stream()
                .anyMatch(tx -> Boolean.TRUE.equals(tx.rememberCategory())))
            throw ApiException.badRequest(
                    "Remember a category on an individual expense, rather than during import.");
        var docs = input.transactions().stream().map(tx -> make(user, tx.type(), tx)).toList();
        var pending = new LinkedHashMap<String, List<Transaction>>();
        var remembered = categoryRules.activeCategories(user);
        for (int i = 0; i < docs.size(); i++) {
            var inputTx = input.transactions().get(i);
            if ("expense".equals(docs.get(i).getType())
                    && (inputTx.category() == null || inputTx.category().isBlank())) {
                var tx = docs.get(i);
                String category = remembered.get(CategoryRuleService.normalize(tx.getTitle()));
                if (category != null) {
                    tx.setCategory(category);
                    tx.setCategoryStatus("remembered");
                } else {
                    pending.computeIfAbsent(tx.getTitle(), ignored -> new ArrayList<>()).add(tx);
                }
            }
        }
        var results = prediction.predictAll(new ArrayList<>(pending.keySet()));
        int index = 0;
        for (var group : pending.values()) {
            var result = results.get(index++);
            for (var tx : group) {
                tx.setCategory(result.category());
                tx.setAiConfidence(result.confidence());
                tx.setCategoryStatus(result.status());
            }
        }
        transactions.insert(docs);
        return docs.size();
    }

    public TransactionPageResponse search(
            String user,
            int page,
            int limit,
            String search,
            String category,
            String start,
            String end,
            String type) {
        if (type != null && !List.of("income", "expense").contains(type))
            throw ApiException.badRequest("Choose income or expense.");
        var from = Dates.parse(start, null);
        var to = Dates.parse(end, null);
        if (end != null && end.length() == 10) to = to.plus(Duration.ofDays(1)).minusNanos(1);
        if (from != null && to != null && from.isAfter(to))
            throw ApiException.badRequest("The start date must be before the end date.");
        return queries.search(user, page, limit, search, category, from, to, type);
    }

    public Transaction owned(String user, String id) {
        return transactions
                .findByIdAndUser(id, user)
                .orElseThrow(() -> ApiException.notFound("Transaction"));
    }

    public Transaction update(String user, String id, CreateTransactionRequest input) {
        var tx = owned(user, id);
        if (input.type() != null && !input.type().equals(tx.getType()))
            throw ApiException.badRequest("The transaction type cannot be changed.");
        validateRemember(user, tx.getType(), input);
        if (tx.getSplitDetails() != null) {
            var splitTotal =
                    tx.getSplitDetails().stream()
                            .map(SplitDetail::getAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (splitTotal.compareTo(input.amount()) > 0)
                throw ApiException.badRequest(
                        "The amount cannot be less than existing splits. Update the splits first.");
        }
        var updated = make(user, tx.getType(), input);
        if ("expense".equals(tx.getType())
                && (input.category() == null || input.category().isBlank())) {
            categorize(user, updated);
        } else if (Objects.equals(updated.getCategory(), tx.getCategory())
                && Objects.equals(updated.getTitle(), tx.getTitle())) {
            updated.setAiConfidence(tx.getAiConfidence());
            updated.setCategoryStatus(tx.getCategoryStatus());
        }
        if ("expense".equals(tx.getType())
                && input.category() != null
                && !input.category().isBlank()
                && !Objects.equals(tx.getCategory(), updated.getCategory())) {
            var history =
                    new ArrayList<>(
                            tx.getCategoryHistory() == null
                                    ? List.<CategoryCorrection>of()
                                    : tx.getCategoryHistory());
            history.add(
                    new CategoryCorrection(
                            tx.getCategory(),
                            updated.getCategory(),
                            updated.getTitle(),
                            tx.getCategoryStatus(),
                            tx.getAiConfidence(),
                            clock.instant()));
            // Bound each expense document; only explicit corrections are retained, never imports or
            // guesses.
            tx.setCategoryHistory(
                    new ArrayList<>(
                            history.subList(Math.max(0, history.size() - 20), history.size())));
        }
        tx.setTitle(updated.getTitle());
        tx.setAmount(updated.getAmount());
        tx.setCategory(updated.getCategory());
        tx.setAiConfidence(updated.getAiConfidence());
        tx.setCategoryStatus(updated.getCategoryStatus());
        tx.setDate(Dates.parse(input.date(), tx.getDate()));
        return rememberAfterSave(user, transactions.save(tx), input);
    }

    public Transaction updateSplits(String user, String id, List<SplitDetail> splits) {
        var tx = owned(user, id);
        tx.setSplitDetails(splits);
        return transactions.save(tx);
    }

    /** Inserts a deterministic occurrence once; duplicate IDs are safe retries. */
    public Optional<Transaction> recordRecurring(Transaction transaction) {
        try {
            return Optional.of(transactions.insert(transaction));
        } catch (org.springframework.dao.DuplicateKeyException alreadyRecorded) {
            return Optional.empty();
        }
    }

    public void delete(String user, String id) {
        transactions.delete(owned(user, id));
    }
}
