package com.expensetracker.features.category.application;

import com.expensetracker.features.category.domain.CategoryRule;
import com.expensetracker.features.category.dto.CategoryRuleRequest;
import com.expensetracker.features.category.infrastructure.CategoryRuleIndexes;
import com.expensetracker.features.category.infrastructure.CategoryRuleRepository;
import com.expensetracker.shared.error.ApiException;
import java.text.Normalizer;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CategoryRuleService {
    private final CategoryRuleRepository rules;
    private final CategoryService categories;
    private final CategoryRuleIndexes indexes;

    /** Keep punctuation, digits and merchant qualifiers: broad matching needs separate consent. */
    public static String normalize(String description) {
        return Normalizer.normalize(description, Normalizer.Form.NFKC)
                .strip()
                .replaceAll("(?U)\\s+", " ")
                .toLowerCase(Locale.ROOT);
    }

    public List<CategoryRule> list(String user) {
        return rules.findByUserOrderByDescriptionAsc(user);
    }

    public Optional<String> match(String user, String description) {
        return rules.findByUserAndNormalizedDescription(user, normalize(description))
                .filter(CategoryRule::isEnabled)
                .map(CategoryRule::getCategory);
    }

    /** Read personal rules once for an import, rather than issuing one query per expense. */
    public Map<String, String> activeCategories(String user) {
        var result = new HashMap<String, String>();
        for (var rule : list(user)) {
            if (rule.isEnabled()) result.put(rule.getNormalizedDescription(), rule.getCategory());
        }
        return result;
    }

    public void validate(String user, String description, String category) {
        if (description == null
                || description.length() > 200
                || normalize(description).isBlank()
                || description
                        .codePoints()
                        .anyMatch(c -> Character.isISOControl(c) && !Character.isWhitespace(c))) {
            throw ApiException.badRequest("Enter a description of 1–200 characters to remember.");
        }
        categories.requireExpenseCategory(user, category);
    }

    /** Remembering an existing description explicitly replaces its previous choice. */
    public CategoryRule remember(String user, String description, String category) {
        validate(user, description, category);
        indexes.ensureReady();
        String normalized = normalize(description);
        var rule =
                rules.findByUserAndNormalizedDescription(user, normalized)
                        .orElseGet(CategoryRule::new);
        rule.setUser(user);
        rule.setDescription(description.strip());
        rule.setNormalizedDescription(normalized);
        rule.setCategory(categories.requireExpenseCategory(user, category));
        rule.setEnabled(true);
        try {
            return rules.save(rule);
        } catch (DuplicateKeyException conflict) {
            // Two first-time saves of the same description share the unique owner/key index.
            var existing =
                    rules.findByUserAndNormalizedDescription(user, normalized)
                            .orElseThrow(() -> conflict);
            existing.setCategory(rule.getCategory());
            existing.setDescription(rule.getDescription());
            existing.setEnabled(true);
            return rules.save(existing);
        }
    }

    public CategoryRule update(String user, String id, CategoryRuleRequest input) {
        var rule = owned(user, id);
        validate(user, input.description(), input.category());
        indexes.ensureReady();
        String normalized = normalize(input.description());
        if (rules.findByUserAndNormalizedDescription(user, normalized)
                .filter(other -> !other.getId().equals(id))
                .isPresent()) {
            throw ApiException.badRequest(
                    "You already have a rule for this description. Edit that rule instead.");
        }
        rule.setDescription(input.description().strip());
        rule.setNormalizedDescription(normalized);
        rule.setCategory(categories.requireExpenseCategory(user, input.category()));
        rule.setEnabled(input.enabled());
        try {
            return rules.save(rule);
        } catch (DuplicateKeyException conflict) {
            throw ApiException.badRequest(
                    "You already have a rule for this description. Edit that rule instead.");
        }
    }

    public void delete(String user, String id) {
        rules.delete(owned(user, id));
    }

    private CategoryRule owned(String user, String id) {
        return rules.findByIdAndUser(id, user)
                .orElseThrow(() -> ApiException.notFound("Category rule"));
    }
}
