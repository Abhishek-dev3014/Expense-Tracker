package com.expensetracker.features.budget.api;

import com.expensetracker.features.budget.application.BudgetService;
import com.expensetracker.features.budget.domain.Budget;
import com.expensetracker.features.budget.dto.BudgetUsageResponse;
import com.expensetracker.features.budget.dto.SaveBudgetRequest;
import com.expensetracker.features.user.domain.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Validated
@RequestMapping("/api/budget")
public class BudgetController {

    private final BudgetService budgets;

    @GetMapping({"", "/"})
    public BudgetUsageResponse usage(@AuthenticationPrincipal User user) {
        return budgets.usage(user.getId());
    }

    @PostMapping({"", "/"})
    public Budget save(
            @AuthenticationPrincipal User user, @Valid @RequestBody SaveBudgetRequest input) {
        return budgets.save(user.getId(), input);
    }
}
