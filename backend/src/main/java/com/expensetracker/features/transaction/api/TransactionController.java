package com.expensetracker.features.transaction.api;

import com.expensetracker.features.transaction.application.TransactionService;
import com.expensetracker.features.transaction.domain.Transaction;
import com.expensetracker.features.transaction.dto.CreateTransactionRequest;
import com.expensetracker.features.transaction.dto.ImportTransactionsRequest;
import com.expensetracker.features.transaction.dto.TransactionPageResponse;
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
@RequestMapping("/api")
public class TransactionController {

    private final TransactionService transactions;

    @GetMapping("/transactions")
    public TransactionPageResponse list(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "1") @Min(1) @Max(1000000) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int limit,
            @RequestParam(required = false) @Size(max = 200) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String type) {
        return transactions.search(
                user.getId(), page, limit, search, category, startDate, endDate, type);
    }

    @PostMapping("/income")
    @ResponseStatus(HttpStatus.CREATED)
    public Transaction income(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateTransactionRequest input) {
        return transactions.create(user.getId(), "income", input);
    }

    @PostMapping("/expense")
    @ResponseStatus(HttpStatus.CREATED)
    public Transaction expense(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateTransactionRequest input) {
        return transactions.create(user.getId(), "expense", input);
    }

    @PostMapping({"/batch", "/transactions/batch"})
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> batch(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ImportTransactionsRequest input) {
        int count = transactions.batch(user.getId(), input);
        return Map.of("message", count + " transactions imported successfully", "count", count);
    }

    @DeleteMapping("/transactions/{id}")
    public Map<String, String> delete(
            @AuthenticationPrincipal User user,
            @PathVariable @Pattern(regexp = "[a-fA-F0-9]{24}") String id) {
        transactions.delete(user.getId(), id);
        return Map.of("message", "Transaction deleted");
    }
}
