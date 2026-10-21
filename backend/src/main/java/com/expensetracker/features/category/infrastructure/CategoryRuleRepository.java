package com.expensetracker.features.category.infrastructure;

import com.expensetracker.features.category.domain.CategoryRule;
import java.util.*;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CategoryRuleRepository extends MongoRepository<CategoryRule, String> {
    List<CategoryRule> findByUserOrderByDescriptionAsc(String user);

    Optional<CategoryRule> findByIdAndUser(String id, String user);

    Optional<CategoryRule> findByUserAndNormalizedDescription(String user, String description);
}
