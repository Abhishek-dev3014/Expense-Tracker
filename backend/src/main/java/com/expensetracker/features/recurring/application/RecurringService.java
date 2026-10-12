package com.expensetracker.features.recurring.application;

import com.expensetracker.features.recurring.domain.RecurringTransaction;
import com.expensetracker.features.recurring.dto.CreateRecurringRequest;
import com.expensetracker.features.recurring.dto.UpdateRecurringRequest;
import com.expensetracker.features.recurring.infrastructure.RecurringOperations;
import com.expensetracker.features.recurring.infrastructure.RecurringTransactionRepository;
import com.expensetracker.features.transaction.application.TransactionService;
import com.expensetracker.features.transaction.domain.Transaction;
import com.expensetracker.shared.error.ApiException;
import com.expensetracker.shared.time.Dates;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RecurringService {
    private final RecurringTransactionRepository recurring;
    private final TransactionService transactions;
    private final RecurringOperations operations;
    private final Clock clock;

    public List<RecurringTransaction> list(String user) {
        return recurring.findByUserOrderByCreatedAtDesc(user);
    }

    public RecurringTransaction create(String user, CreateRecurringRequest input) {
        var item = new RecurringTransaction();
        item.setUser(user);
        item.setTitle(input.title().strip());
        item.setAmount(input.amount());
        item.setCategory(input.category().strip());
        item.setType(input.type());
        item.setFrequency(input.frequency());
        item.setStartDate(Dates.parse(input.startDate(), clock.instant()));
        item.setNextOccurrence(item.getStartDate());
        return recurring.insert(item);
    }

    public RecurringTransaction update(String user, String id, UpdateRecurringRequest input) {
        var item = owned(user, id);
        if (input.title() != null) {
            if (input.title().isBlank()) throw ApiException.badRequest("Enter a title.");
            item.setTitle(input.title().strip());
        }
        if (input.amount() != null) item.setAmount(input.amount());
        if (input.category() != null) {
            if (input.category().isBlank()) throw ApiException.badRequest("Choose a category.");
            item.setCategory(input.category().strip());
        }
        if (input.type() != null) item.setType(input.type());
        if (input.frequency() != null) item.setFrequency(input.frequency());
        if (input.status() != null) item.setStatus(input.status());
        return recurring.save(item);
    }

    private RecurringTransaction owned(String user, String id) {
        return recurring
                .findByIdAndUser(id, user)
                .orElseThrow(() -> ApiException.notFound("Recurring transaction"));
    }

    public void delete(String user, String id) {
        recurring.delete(owned(user, id));
    }

    public List<Transaction> process(String user) {
        var result = new ArrayList<Transaction>();
        for (var item :
                recurring.findByUserAndStatusAndNextOccurrenceLessThanEqual(
                        user, "active", clock.instant())) {
            var tx = new Transaction();
            // Deterministic ObjectId makes retry after a crash or a concurrent call idempotent.
            tx.setId(occurrenceId(item.getId(), item.getNextOccurrence()));
            tx.setUser(user);
            tx.setTitle(item.getTitle() + " (Recurring)");
            tx.setType(item.getType());
            tx.setAmount(
                    "expense".equals(item.getType())
                            ? item.getAmount().abs().negate()
                            : item.getAmount().abs());
            tx.setCategory(item.getCategory());
            tx.setDate(item.getNextOccurrence());
            transactions.recordRecurring(tx).ifPresent(result::add);
            operations.advance(
                    item,
                    Dates.next(item.getNextOccurrence(), item.getFrequency(), clock.getZone()),
                    clock.instant());
        }
        return result;
    }

    public static String occurrenceId(String id, Instant date) {
        try {
            return HexFormat.of()
                    .formatHex(
                            MessageDigest.getInstance("SHA-256")
                                    .digest((id + ":" + date).getBytes(StandardCharsets.UTF_8)))
                    .substring(0, 24);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
