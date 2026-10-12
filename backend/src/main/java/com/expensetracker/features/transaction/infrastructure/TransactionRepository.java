package com.expensetracker.features.transaction.infrastructure;

import com.expensetracker.features.transaction.domain.Transaction;
import java.util.*;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TransactionRepository extends MongoRepository<Transaction, String> {
    List<Transaction> findByUserOrderByDateDesc(String user);

    Optional<Transaction> findByIdAndUser(String id, String user);

    long countByUser(String user);
}
