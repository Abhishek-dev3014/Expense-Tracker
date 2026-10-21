package com.expensetracker.features.category.infrastructure;

import com.expensetracker.features.category.domain.CategoryRule;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.stereotype.Component;

/** Production skips automatic indexes to keep database work out of HTTP startup. */
@Component
@RequiredArgsConstructor
public class CategoryRuleIndexes {
    private final MongoTemplate mongo;
    private volatile boolean ready;

    /** Create the small rule collection's unique index before its first write, not at startup. */
    public void ensureReady() {
        if (ready) return;
        synchronized (this) {
            if (ready) return;
            mongo.indexOps(CategoryRule.class)
                    .ensureIndex(
                            new Index()
                                    .on("user", Sort.Direction.ASC)
                                    .on("normalizedDescription", Sort.Direction.ASC)
                                    .unique()
                                    .named("user_description"));
            ready = true;
        }
    }
}
