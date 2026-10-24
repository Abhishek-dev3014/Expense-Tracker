package com.expensetracker.features.spendingreview.domain;

import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document("spendingvaluerules")
public class SpendingValueRule {
    @Id private String id;

    @org.springframework.data.mongodb.core.index.Indexed(name = "spending_rule_user")
    private String user;

    private String description;
    private String normalizedDescription;
    private String value;
    private Instant updatedAt;
}
