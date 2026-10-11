package com.expensetracker.features.category.infrastructure;

import com.expensetracker.features.category.domain.Category;
import java.util.*;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CategoryRepository extends MongoRepository<Category, String> {
    List<Category> findByUserAndTypeOrderByNameAsc(String user, String type);

    Optional<Category> findByUserAndTypeAndNormalizedName(
            String user, String type, String normalizedName);
}
