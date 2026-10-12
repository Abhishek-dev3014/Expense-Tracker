package com.expensetracker.features.category.application;

import com.expensetracker.features.category.domain.Category;
import com.expensetracker.features.category.dto.CreateCategoryRequest;
import com.expensetracker.features.category.infrastructure.CategoryRepository;
import com.expensetracker.shared.error.ApiException;
import java.text.Normalizer;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CategoryService {
    private final CategoryRepository categories;
    private static final Map<String, List<String>> DEFAULTS =
            Map.of(
                    "expense",
                            List.of(
                                    "Food",
                                    "Transport",
                                    "Shopping",
                                    "Rent",
                                    "Utilities",
                                    "Entertainment",
                                    "Health",
                                    "Education",
                                    "Other"),
                    "income", List.of("Salary", "Freelance", "Business", "Investment", "Other"));

    public List<String> list(String user, String type) {
        if (!DEFAULTS.containsKey(type))
            throw ApiException.badRequest("Choose income or expense categories.");
        return categories.findByUserAndTypeOrderByNameAsc(user, type).stream()
                .map(Category::getName)
                .toList();
    }

    public String create(String user, CreateCategoryRequest input) {
        String name =
                Normalizer.normalize(input.name(), Normalizer.Form.NFKC)
                        .strip()
                        .replaceAll("(?U)\\s+", " ");
        if (name.isBlank()
                || name.length() > 40
                || name.codePoints()
                        .anyMatch(
                                c ->
                                        Character.isISOControl(c)
                                                || Character.getType(c) == Character.FORMAT))
            throw ApiException.badRequest("Enter a category name of 1–40 characters.");
        String normalized = name.toLowerCase(Locale.ROOT);
        var builtIn =
                DEFAULTS.get(input.type()).stream()
                        .filter(s -> s.equalsIgnoreCase(normalized))
                        .findFirst();
        if (builtIn.isPresent()) return builtIn.get();
        var existing =
                categories.findByUserAndTypeAndNormalizedName(user, input.type(), normalized);
        if (existing.isPresent()) return existing.get().getName();
        var category = new Category();
        category.setUser(user);
        category.setType(input.type());
        category.setName(name);
        category.setNormalizedName(normalized);
        try {
            return categories.insert(category).getName();
        } catch (DuplicateKeyException e) {
            return categories
                    .findByUserAndTypeAndNormalizedName(user, input.type(), normalized)
                    .orElseThrow(() -> e)
                    .getName();
        }
    }
}
