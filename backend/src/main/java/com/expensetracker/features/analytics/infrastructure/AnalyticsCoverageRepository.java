package com.expensetracker.features.analytics.infrastructure;

import com.expensetracker.features.analytics.domain.AnalyticsCoverage;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AnalyticsCoverageRepository extends MongoRepository<AnalyticsCoverage, String> {}
