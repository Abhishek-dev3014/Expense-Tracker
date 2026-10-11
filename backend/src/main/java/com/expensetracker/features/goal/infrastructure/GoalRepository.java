package com.expensetracker.features.goal.infrastructure;

import com.expensetracker.features.goal.domain.Goal;
import java.util.*;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface GoalRepository extends MongoRepository<Goal, String> {
    List<Goal> findByUserOrderByCreatedAtDesc(String user);

    Optional<Goal> findByIdAndUser(String id, String user);

    long countByUserAndStatus(String user, String status);
}
