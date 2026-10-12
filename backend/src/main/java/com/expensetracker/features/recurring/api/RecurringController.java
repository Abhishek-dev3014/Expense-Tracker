package com.expensetracker.features.recurring.api;

import com.expensetracker.features.recurring.application.RecurringService;
import com.expensetracker.features.recurring.domain.RecurringTransaction;
import com.expensetracker.features.recurring.dto.CreateRecurringRequest;
import com.expensetracker.features.recurring.dto.UpdateRecurringRequest;
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
@RequestMapping("/api/recurring")
public class RecurringController {

    private final RecurringService recurring;

    @GetMapping({"", "/"})
    public List<RecurringTransaction> list(@AuthenticationPrincipal User user) {
        return recurring.list(user.getId());
    }

    @PostMapping({"", "/"})
    @ResponseStatus(HttpStatus.CREATED)
    public RecurringTransaction create(
            @AuthenticationPrincipal User user, @Valid @RequestBody CreateRecurringRequest input) {
        return recurring.create(user.getId(), input);
    }

    @PutMapping("/{id}")
    public RecurringTransaction update(
            @AuthenticationPrincipal User user,
            @PathVariable @Pattern(regexp = "[a-fA-F0-9]{24}") String id,
            @Valid @RequestBody UpdateRecurringRequest input) {
        return recurring.update(user.getId(), id, input);
    }

    @DeleteMapping("/{id}")
    public Map<String, String> delete(
            @AuthenticationPrincipal User user,
            @PathVariable @Pattern(regexp = "[a-fA-F0-9]{24}") String id) {
        recurring.delete(user.getId(), id);
        return Map.of("message", "Recurring transaction removed");
    }

    @PostMapping("/process")
    public Map<String, Object> process(@AuthenticationPrincipal User user) {
        var created = recurring.process(user.getId());
        return Map.of(
                "message",
                "Processed " + created.size() + " recurring items",
                "transactions",
                created);
    }
}
