package com.expensetracker.features.spendingreview.api;

import com.expensetracker.features.spendingreview.application.SpendingReviewService;
import com.expensetracker.features.spendingreview.domain.*;
import com.expensetracker.features.spendingreview.dto.SpendingReviewDtos.*;
import com.expensetracker.features.transaction.domain.Transaction;
import com.expensetracker.features.user.domain.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Validated
@RequestMapping("/api/spending-review")
public class SpendingReviewController {
    private final SpendingReviewService reviews;

    @GetMapping
    public Review summary(
            @AuthenticationPrincipal User user, @RequestParam(required = false) String month) {
        return reviews.summary(user.getId(), month);
    }

    @PostMapping("/suggest")
    public Suggestion suggest(
            @AuthenticationPrincipal User user, @Valid @RequestBody Suggest input) {
        return reviews.suggest(user.getId(), input);
    }

    @PutMapping("/preferences")
    public SpendingPreferences preferences(
            @AuthenticationPrincipal User user, @Valid @RequestBody Preferences input) {
        return reviews.updatePreferences(user.getId(), input);
    }

    @PostMapping("/rules")
    public SpendingValueRule remember(
            @AuthenticationPrincipal User user, @Valid @RequestBody Rule input) {
        return reviews.remember(user.getId(), input);
    }

    @DeleteMapping("/rules/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@AuthenticationPrincipal User user, @PathVariable String id) {
        reviews.removeRule(user.getId(), id);
    }

    @PutMapping("/transactions/{id}")
    public Transaction rate(
            @AuthenticationPrincipal User user,
            @PathVariable @Pattern(regexp = "[a-fA-F0-9]{24}") String id,
            @Valid @RequestBody Rating input) {
        return reviews.rate(user.getId(), id, input);
    }
}
