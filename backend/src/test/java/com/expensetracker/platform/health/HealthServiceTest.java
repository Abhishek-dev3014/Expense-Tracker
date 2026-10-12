package com.expensetracker.platform.health;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.time.*;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.data.mongodb.core.MongoTemplate;

class HealthServiceTest {
    @Test
    void healthDetectsDatabaseOutagesWithoutExposingConnectionDetails() {
        var mongo = mock(MongoTemplate.class);
        when(mongo.executeCommand(any(Document.class)))
                .thenThrow(new DataAccessResourceFailureException("private connection details"));
        assertThat(new HealthService(mongo).ready()).isFalse();
    }
}
