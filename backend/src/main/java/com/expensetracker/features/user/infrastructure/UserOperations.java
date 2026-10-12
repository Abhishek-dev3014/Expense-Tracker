package com.expensetracker.features.user.infrastructure;

import com.expensetracker.features.user.domain.User;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.*;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class UserOperations {
    private final MongoTemplate mongo;

    public User completeTutorial(String id) {
        return mongo.findAndModify(
                Query.query(Criteria.where("id").is(id)),
                new Update().set("hasSeenTutorial", true),
                FindAndModifyOptions.options().returnNew(true),
                User.class);
    }

    public User streak(User user, Instant day, int count) {
        return mongo.findAndModify(
                Query.query(
                        Criteria.where("id")
                                .is(user.getId())
                                .and("lastLoginDate")
                                .is(user.getLastLoginDate())),
                new Update().set("lastLoginDate", day).set("streakCount", count),
                FindAndModifyOptions.options().returnNew(true),
                User.class);
    }

    public User addBadges(String id, List<String> badges) {
        return mongo.findAndModify(
                Query.query(Criteria.where("id").is(id)),
                new Update().addToSet("badges").each(badges.toArray()),
                FindAndModifyOptions.options().returnNew(true),
                User.class);
    }
}
