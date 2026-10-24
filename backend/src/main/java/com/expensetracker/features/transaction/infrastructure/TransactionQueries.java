package com.expensetracker.features.transaction.infrastructure;

import com.expensetracker.features.transaction.domain.Transaction;
import com.expensetracker.features.transaction.dto.TransactionPageResponse;
import java.time.Instant;
import java.util.List;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class TransactionQueries {
    private final MongoTemplate mongo;

    public TransactionPageResponse search(
            String user,
            int page,
            int limit,
            String search,
            String category,
            Instant start,
            Instant end,
            String type) {
        var query = Query.query(Criteria.where("user").is(user));
        if (search != null && !search.isBlank())
            query.addCriteria(Criteria.where("title").regex(Pattern.quote(search), "i"));
        if (category != null && !category.isBlank() && !"All".equals(category))
            query.addCriteria(Criteria.where("category").is(category));
        if (type != null) query.addCriteria(Criteria.where("type").is(type));
        if (start != null || end != null) {
            var date = Criteria.where("date");
            if (start != null) date.gte(start);
            if (end != null) date.lte(end);
            query.addCriteria(date);
        }
        long total = mongo.count(query, Transaction.class);
        query.with(Sort.by(Sort.Direction.DESC, "date", "id"))
                .skip((long) (page - 1) * limit)
                .limit(limit);
        return new TransactionPageResponse(
                mongo.find(query, Transaction.class),
                total,
                page,
                (int) Math.ceil((double) total / limit));
    }

    public List<Transaction> inMonth(String user, Instant start, Instant end) {
        return mongo.find(
                Query.query(Criteria.where("user").is(user).and("date").gte(start).lt(end))
                        .with(Sort.by(Sort.Direction.DESC, "date")),
                Transaction.class);
    }

    public List<Transaction> spendingReviewExamples(String user) {
        return mongo.find(
                Query.query(
                                Criteria.where("user")
                                        .is(user)
                                        .and("type")
                                        .is("expense")
                                        .and("spendingValue")
                                        .in("good", "fine", "improve"))
                        .with(Sort.by(Sort.Direction.DESC, "spendingValueReviewedAt"))
                        .limit(300),
                Transaction.class);
    }

    public Transaction reviewSpending(String user, String id, String value, Instant now) {
        var query =
                Query.query(
                        Criteria.where("user")
                                .is(user)
                                .and("_id")
                                .is(id)
                                .and("type")
                                .is("expense"));
        var update = new Update().set("updatedAt", now);
        if ("unreviewed".equals(value))
            update.unset("spendingValue").unset("spendingValueReviewedAt");
        else update.set("spendingValue", value).set("spendingValueReviewedAt", now);
        return mongo.findAndModify(
                query,
                update,
                org.springframework.data.mongodb.core.FindAndModifyOptions.options()
                        .returnNew(true),
                Transaction.class);
    }
}
