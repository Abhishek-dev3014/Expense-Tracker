package com.expensetracker.features.goal.domain;

import com.expensetracker.shared.persistence.BaseDocument;
import com.fasterxml.jackson.annotation.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.TypeAlias;
import org.springframework.data.mongodb.core.index.*;
import org.springframework.data.mongodb.core.mapping.*;

@Getter
@Setter
@TypeAlias("goals")
@Document("goals")
public class Goal extends BaseDocument {

    @Field(targetType = FieldType.OBJECT_ID)
    private String user;

    private String name;

    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal targetAmount;

    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal currentAmount = BigDecimal.ZERO;

    private String category;
    private Instant deadline;
    private String status = "active";
}
