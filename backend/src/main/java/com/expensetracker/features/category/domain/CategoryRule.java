package com.expensetracker.features.category.domain;

import com.expensetracker.shared.persistence.BaseDocument;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.TypeAlias;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.*;

@Getter
@Setter
@TypeAlias("categoryrules")
@Document("categoryrules")
@CompoundIndex(
        name = "user_description",
        def = "{'user': 1, 'normalizedDescription': 1}",
        unique = true)
public class CategoryRule extends BaseDocument {
    @Field(targetType = FieldType.OBJECT_ID)
    private String user;

    private String description;
    private String normalizedDescription;
    private String category;
    private boolean enabled = true;
}
