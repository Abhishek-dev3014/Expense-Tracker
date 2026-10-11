package com.expensetracker.features.goal.api;

import com.expensetracker.features.goal.application.GoalService;
import com.expensetracker.features.goal.domain.Goal;
import com.expensetracker.features.goal.dto.CreateGoalRequest;
import com.expensetracker.features.goal.dto.UpdateGoalRequest;
import com.expensetracker.features.user.domain.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Validated
@RequestMapping("/api/goals")
public class GoalController {

    private final GoalService goals;

    @GetMapping({"", "/"})
    public List<Goal> list(@AuthenticationPrincipal User user) {
        return goals.list(user.getId());
    }

    @PostMapping({"", "/"})
    @ResponseStatus(HttpStatus.CREATED)
    public Goal create(
            @AuthenticationPrincipal User user, @Valid @RequestBody CreateGoalRequest input) {
        return goals.create(user.getId(), input);
    }

    @PutMapping("/{id}")
    public Goal update(
            @AuthenticationPrincipal User user,
            @PathVariable @Pattern(regexp = "[a-fA-F0-9]{24}") String id,
            @Valid @RequestBody UpdateGoalRequest input) {
        return goals.update(user.getId(), id, input);
    }

    @DeleteMapping("/{id}")
    public Map<String, String> delete(
            @AuthenticationPrincipal User user,
            @PathVariable @Pattern(regexp = "[a-fA-F0-9]{24}") String id) {
        goals.delete(user.getId(), id);
        return Map.of("message", "Goal removed");
    }
}
