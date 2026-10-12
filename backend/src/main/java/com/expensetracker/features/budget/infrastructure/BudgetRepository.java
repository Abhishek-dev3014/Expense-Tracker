package com.expensetracker.features.budget.infrastructure;

import com.expensetracker.features.budget.domain.Budget;
import java.util.*;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface BudgetRepository extends MongoRepository<Budget, String> {
    Optional<Budget> findByUserAndMonth(String user, String month);
}
