package com.expensetracker.features.spendingreview.infrastructure;

import com.expensetracker.features.spendingreview.domain.SpendingPreferences;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SpendingPreferencesRepository
        extends MongoRepository<SpendingPreferences, String> {}
