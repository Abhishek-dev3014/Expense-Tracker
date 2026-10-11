package com.expensetracker.features.category.api;

import com.expensetracker.features.category.application.CategoryService;
import com.expensetracker.features.category.dto.CreateCategoryRequest;
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
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categories;

    @GetMapping({"", "/"})
    public Map<String, List<String>> list(
            @AuthenticationPrincipal User user, @RequestParam String type) {
        return Map.of("categories", categories.list(user.getId(), type));
    }

    @PostMapping({"", "/"})
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> create(
            @AuthenticationPrincipal User user, @Valid @RequestBody CreateCategoryRequest input) {
        return Map.of("name", categories.create(user.getId(), input));
    }
}
