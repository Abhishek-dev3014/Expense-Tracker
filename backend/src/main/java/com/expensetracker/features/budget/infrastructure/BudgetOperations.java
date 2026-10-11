package com.expensetracker.features.budget.infrastructure;

import com.expensetracker.features.budget.domain.Budget;
import com.expensetracker.features.budget.dto.SaveBudgetRequest;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.*;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class BudgetOperations {
    private final MongoTemplate mongo;

    public Budget upsert(String user, String month, SaveBudgetRequest input) {
        var query = Query.query(Criteria.where("user").is(user).and("month").is(month));
        var update =
                new Update()
                        .set("monthlyLimit", input.monthlyLimit())
                        .set(
                                "categoryLimits",
                                input.categoryLimits() == null ? Map.of() : input.categoryLimits());
        try {
            return mongo.findAndModify(
                    query,
                    update,
                    FindAndModifyOptions.options().upsert(true).returnNew(true),
                    Budget.class);
        } catch (DuplicateKeyException e) {
            return mongo.findAndModify(
                    query, update, FindAndModifyOptions.options().returnNew(true), Budget.class);
        }
    }
}
