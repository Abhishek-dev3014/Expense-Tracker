package com.expensetracker.features.split.infrastructure;

import com.expensetracker.features.split.domain.SplitRequest;
import java.util.*;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SplitRequestRepository extends MongoRepository<SplitRequest, String> {
    List<SplitRequest> findByToEmailAndStatusIn(String email, List<String> statuses);

    Optional<SplitRequest> findByIdAndToEmail(String id, String email);
}
