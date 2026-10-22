package com.expensetracker.features.recurring.domain;

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
@TypeAlias("recurringtransactions")
@Document("recurringtransactions")
@CompoundIndex(name = "recurring_due", def = "{'user': 1, 'status': 1, 'nextOccurrence': 1}")
public class RecurringTransaction extends BaseDocument {

    @Field(targetType = FieldType.OBJECT_ID)
    private String user;

    private String title;

    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal amount;

    private String category;
    private String type;
    private String frequency;
    private Instant startDate;
    private Instant nextOccurrence;
    private Instant lastProcessed;
    private String status = "active";

    // Explicitly confirmed source payments; no merchant-wide exclusion or ledger rewrite.
    @JsonIgnore private List<String> baselineTransactionIds = List.of();
}
