package com.expensetracker.features.goal.application;

import com.expensetracker.features.goal.domain.Goal;
import com.expensetracker.features.goal.dto.CreateGoalRequest;
import com.expensetracker.features.goal.dto.UpdateGoalRequest;
import com.expensetracker.features.goal.infrastructure.GoalRepository;
import com.expensetracker.shared.error.ApiException;
import com.expensetracker.shared.time.Dates;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GoalService {
    private final GoalRepository goals;

    public long completedCount(String user) {
        return goals.countByUserAndStatus(user, "completed");
    }

    public List<Goal> list(String user) {
        return goals.findByUserOrderByCreatedAtDesc(user);
    }

    public Goal create(String user, CreateGoalRequest input) {
        var goal = new Goal();
        goal.setUser(user);
        goal.setName(input.name().strip());
        goal.setTargetAmount(input.targetAmount());
        goal.setCategory(input.category());
        goal.setDeadline(Dates.parse(input.deadline(), null));
        return goals.insert(goal);
    }

    public Goal update(String user, String id, UpdateGoalRequest input) {
        var goal = owned(user, id);
        if (input.name() != null) {
            if (input.name().isBlank()) throw ApiException.badRequest("Enter a goal name.");
            goal.setName(input.name().strip());
        }
        if (input.targetAmount() != null) goal.setTargetAmount(input.targetAmount());
        if (input.currentAmount() != null) goal.setCurrentAmount(input.currentAmount());
        if (input.category() != null) goal.setCategory(input.category());
        if (input.deadline() != null) goal.setDeadline(Dates.parse(input.deadline(), null));
        if (input.status() != null) goal.setStatus(input.status());
        if (!"cancelled".equals(goal.getStatus()))
            goal.setStatus(
                    goal.getCurrentAmount().compareTo(goal.getTargetAmount()) >= 0
                            ? "completed"
                            : "active");
        return goals.save(goal);
    }

    private Goal owned(String user, String id) {
        return goals.findByIdAndUser(id, user).orElseThrow(() -> ApiException.notFound("Goal"));
    }

    public void delete(String user, String id) {
        goals.delete(owned(user, id));
    }
}
