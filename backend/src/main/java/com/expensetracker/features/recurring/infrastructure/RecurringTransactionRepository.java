package com.expensetracker.features.recurring.infrastructure;

import com.expensetracker.features.recurring.domain.RecurringTransaction;
import java.time.Instant;
import java.util.*;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface RecurringTransactionRepository
        extends MongoRepository<RecurringTransaction, String> {
    List<RecurringTransaction> findByUserOrderByCreatedAtDesc(String user);

    Optional<RecurringTransaction> findByIdAndUser(String id, String user);

    List<RecurringTransaction> findByUserAndStatusAndNextOccurrenceLessThanEqual(
            String user, String status, Instant now);
}
