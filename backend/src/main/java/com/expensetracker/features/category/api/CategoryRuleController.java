package com.expensetracker.features.category.api;

import com.expensetracker.features.category.application.CategoryRuleService;
import com.expensetracker.features.category.domain.CategoryRule;
import com.expensetracker.features.category.dto.CategoryRuleRequest;
import com.expensetracker.features.user.domain.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Validated
@RequestMapping("/api/category-rules")
public class CategoryRuleController {
    private final CategoryRuleService rules;

    @GetMapping
    public List<CategoryRule> list(@AuthenticationPrincipal User user) {
        return rules.list(user.getId());
    }

    @PutMapping("/{id}")
    public CategoryRule update(
            @AuthenticationPrincipal User user,
            @PathVariable @Pattern(regexp = "[a-fA-F0-9]{24}") String id,
            @Valid @RequestBody CategoryRuleRequest input) {
        return rules.update(user.getId(), id, input);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal User user,
            @PathVariable @Pattern(regexp = "[a-fA-F0-9]{24}") String id) {
        rules.delete(user.getId(), id);
    }
}
