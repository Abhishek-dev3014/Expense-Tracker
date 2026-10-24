package com.expensetracker.features.spendingreview.infrastructure;

import com.expensetracker.features.spendingreview.domain.SpendingValueRule;
import java.util.*;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SpendingValueRuleRepository extends MongoRepository<SpendingValueRule, String> {
    List<SpendingValueRule> findByUserOrderByUpdatedAtDesc(String user);

    Optional<SpendingValueRule> findByIdAndUser(String id, String user);

    long countByUser(String user);
}
