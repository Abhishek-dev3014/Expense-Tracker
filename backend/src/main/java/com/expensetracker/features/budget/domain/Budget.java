package com.expensetracker.features.budget.domain;

import com.expensetracker.shared.persistence.BaseDocument;
import com.fasterxml.jackson.annotation.*;
import java.math.BigDecimal;
import java.util.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.TypeAlias;
import org.springframework.data.mongodb.core.index.*;
import org.springframework.data.mongodb.core.mapping.*;

@Getter
@Setter
@TypeAlias("budgets")
@Document("budgets")
@CompoundIndex(name = "user_month", def = "{'user': 1, 'month': 1}", unique = true)
public class Budget extends BaseDocument {

    @Field(targetType = FieldType.OBJECT_ID)
    private String user;

    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal monthlyLimit;

    private Map<String, BigDecimal> categoryLimits = new LinkedHashMap<>();
    private String month;
}
