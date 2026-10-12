package com.expensetracker.features.transaction.application;

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
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TransactionService {
    private final TransactionRepository transactions;
    private final TransactionQueries queries;
    private final CategoryPredictionClient prediction;
    private final Clock clock;

    public Transaction create(String user, String type, CreateTransactionRequest input) {
        var tx = make(user, type, input);
        if ("expense".equals(type) && (input.category() == null || input.category().isBlank())) {
            var result = prediction.predict(input.title());
            tx.setCategory(result.category());
            tx.setAiConfidence(result.confidence());
        }
        return transactions.insert(tx);
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
        var docs = input.transactions().stream().map(tx -> make(user, tx.type(), tx)).toList();
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
            var result = prediction.predict(input.title());
            updated.setCategory(result.category());
            updated.setAiConfidence(result.confidence());
        } else if (Objects.equals(updated.getCategory(), tx.getCategory())) {
            updated.setAiConfidence(tx.getAiConfidence());
        }
        tx.setTitle(updated.getTitle());
        tx.setAmount(updated.getAmount());
        tx.setCategory(updated.getCategory());
        tx.setAiConfidence(updated.getAiConfidence());
        tx.setDate(Dates.parse(input.date(), tx.getDate()));
        return transactions.save(tx);
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
