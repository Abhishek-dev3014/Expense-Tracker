package com.expensetracker.features.transaction.domain;

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
@TypeAlias("transactions")
@Document("transactions")
@CompoundIndex(name = "user_date", def = "{'user': 1, 'date': -1}")
public class Transaction extends BaseDocument {

    @Field(targetType = FieldType.OBJECT_ID)
    private String user;

    private String title;

    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal amount;

    private String type;
    private String category = "General";
    private double aiConfidence;
    private Instant date;
    private List<SplitDetail> splitDetails = new ArrayList<>();
}
