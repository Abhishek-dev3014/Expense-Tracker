package com.expensetracker.features.analytics.infrastructure;

import com.expensetracker.features.analytics.domain.InsightFeedback;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface InsightFeedbackRepository extends MongoRepository<InsightFeedback, String> {}
