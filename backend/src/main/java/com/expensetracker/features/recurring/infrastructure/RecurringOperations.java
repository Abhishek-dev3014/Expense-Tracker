package com.expensetracker.features.recurring.infrastructure;

import com.expensetracker.features.recurring.domain.RecurringTransaction;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class RecurringOperations {
    private final MongoTemplate mongo;

    public void advance(RecurringTransaction item, Instant next, Instant now) {
        // Compare-and-set: overlapping processors must never advance an occurrence twice.
        mongo.updateFirst(
                Query.query(
                        Criteria.where("id")
                                .is(item.getId())
                                .and("user")
                                .is(item.getUser())
                                .and("nextOccurrence")
                                .is(item.getNextOccurrence())),
                new Update()
                        .set("lastProcessed", item.getNextOccurrence())
                        .set("nextOccurrence", next)
                        .set("updatedAt", now),
                RecurringTransaction.class);
    }
}
