package com.expensetracker.features.gamification.application;

import com.expensetracker.features.gamification.dto.BadgesResponse;
import com.expensetracker.features.goal.application.GoalService;
import com.expensetracker.features.transaction.application.TransactionReadService;
import com.expensetracker.features.user.application.UserService;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GamificationService {
    private final UserService users;
    private final TransactionReadService transactions;
    private final GoalService goals;

    public BadgesResponse badges(String id) {
        var user = users.profile(id);
        var earned = new ArrayList<String>();
        long count = transactions.count(id);
        if (count >= 1) earned.add("First Step");
        if (count >= 50) earned.add("Transaction Pro");
        if (goals.completedCount(id) >= 1) earned.add("Goal Crusher");
        if (user.getStreakCount() >= 7) earned.add("Weekly Warrior");
        var existing = user.getBadges() == null ? List.<String>of() : user.getBadges();
        earned.removeAll(existing);
        if (earned.isEmpty()) return new BadgesResponse(existing, earned);
        return new BadgesResponse(users.addBadges(id, earned).getBadges(), earned);
    }
}
