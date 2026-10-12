package com.expensetracker.platform.health;

import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class HealthService {
    private final MongoTemplate mongo;

    public boolean ready() {
        try {
            mongo.executeCommand(new Document("ping", 1));
            return true;
        } catch (Exception unavailable) {
            return false;
        }
    }
}
