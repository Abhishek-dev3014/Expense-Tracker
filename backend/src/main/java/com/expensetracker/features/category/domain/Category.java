package com.expensetracker.features.category.domain;

import com.expensetracker.shared.persistence.BaseDocument;
import com.fasterxml.jackson.annotation.*;
import java.util.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.TypeAlias;
import org.springframework.data.mongodb.core.index.*;
import org.springframework.data.mongodb.core.mapping.*;

@Getter
@Setter
@TypeAlias("categories")
@Document("categories")
@CompoundIndex(
        name = "user_1_type_1_normalizedName_1",
        def = "{'user': 1, 'type': 1, 'normalizedName': 1}",
        unique = true)
public class Category extends BaseDocument {

    @Field(targetType = FieldType.OBJECT_ID)
    private String user;

    private String type;
    private String name;
    private String normalizedName;
}
