package com.expensetracker.features.analytics.domain;

import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document("analyticscoverage")
public class AnalyticsCoverage {
    @Id private String id; // The authenticated account ID; one atomic document per account.
    private LocalDate from;
    private LocalDate through;
}
