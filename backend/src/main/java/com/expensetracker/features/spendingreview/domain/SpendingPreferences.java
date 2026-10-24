package com.expensetracker.features.spendingreview.domain;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document("spendingpreferences")
public class SpendingPreferences {
    @Id private String id;
    private boolean learningEnabled;
    private boolean foodGuideEnabled;
}
