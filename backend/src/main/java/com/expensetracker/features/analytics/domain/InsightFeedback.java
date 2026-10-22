package com.expensetracker.features.analytics.domain;

import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document("insightfeedback")
public class InsightFeedback {
    @Id private String id;
    private String user;
    private String month;
    private String insightId;
    private String response;
    private Instant updatedAt;
}
