package com.expensetracker.shared.persistence;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.FieldType;
import org.springframework.data.mongodb.core.mapping.MongoId;

@Getter
@Setter
public abstract class BaseDocument {
    @MongoId(FieldType.OBJECT_ID)
    @JsonProperty("_id")
    private String id;

    @CreatedDate private Instant createdAt;
    @LastModifiedDate private Instant updatedAt;
}
