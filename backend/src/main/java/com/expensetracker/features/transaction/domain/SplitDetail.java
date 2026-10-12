package com.expensetracker.features.transaction.domain;

import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

@Getter
@Setter
public class SplitDetail {
    private String name;
    private String email;

    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal amount;

    private String status = "pending";
}
