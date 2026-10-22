package com.expensetracker.features.analytics.api;

import com.expensetracker.features.analytics.application.AnalyticsPlanningService;
import com.expensetracker.features.analytics.dto.PlanningRequests;
import com.expensetracker.features.analytics.dto.PlanningResponse;
import com.expensetracker.features.user.domain.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/analytics")
public class AnalyticsPlanningController {
    private final AnalyticsPlanningService planning;

    @GetMapping
    public PlanningResponse summary(
            @AuthenticationPrincipal User user, @RequestParam(required = false) String month) {
        return planning.summary(user.getId(), month);
    }

    @PutMapping("/coverage")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void coverage(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody PlanningRequests.Coverage input) {
        planning.coverage(user.getId(), input);
    }

    @DeleteMapping("/coverage")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearCoverage(@AuthenticationPrincipal User user) {
        planning.clearCoverage(user.getId());
    }

    @PostMapping("/scenarios")
    public PlanningRequests.ScenarioResult scenario(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody PlanningRequests.Scenario input) {
        return planning.scenario(user.getId(), input);
    }

    @PostMapping("/insights/{id}/feedback")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void feedback(
            @AuthenticationPrincipal User user,
            @PathVariable String id,
            @Valid @RequestBody PlanningRequests.Feedback input) {
        planning.feedback(user.getId(), id, input);
    }

    @PostMapping("/recurring-candidates/{id}/confirm")
    public Object confirm(
            @AuthenticationPrincipal User user,
            @PathVariable String id,
            @Valid @RequestBody PlanningRequests.Confirm input) {
        return planning.confirm(user.getId(), id, input);
    }
}
