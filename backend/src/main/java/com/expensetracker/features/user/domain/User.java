package com.expensetracker.features.user.domain;

import com.expensetracker.shared.persistence.BaseDocument;
import com.fasterxml.jackson.annotation.*;
import java.time.Instant;
import java.util.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.TypeAlias;
import org.springframework.data.mongodb.core.index.*;
import org.springframework.data.mongodb.core.mapping.*;

@Getter
@Setter
@TypeAlias("users")
@Document("users")
public class User extends BaseDocument {

    private String name;

    @Indexed(name = "email_1", unique = true)
    private String email;

    @JsonIgnore private String password;
    private int streakCount;
    private Instant lastLoginDate;
    private boolean hasSeenTutorial;
    private List<String> badges = new ArrayList<>();
}
