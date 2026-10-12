package com.expensetracker.features.user.infrastructure;

import com.expensetracker.features.user.domain.User;
import java.util.*;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
}
