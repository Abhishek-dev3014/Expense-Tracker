package com.expensetracker.features.split.domain;

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
@TypeAlias("splitrequests")
@Document("splitrequests")
public class SplitRequest extends BaseDocument {

    @Field(targetType = FieldType.OBJECT_ID)
    private String fromUser;

    @Indexed(name = "toEmail_1")
    private String toEmail;

    @Field(targetType = FieldType.DECIMAL128)
    private BigDecimal amount;

    private String transactionTitle;
    private String status = "pending";
    private Instant date;
}
