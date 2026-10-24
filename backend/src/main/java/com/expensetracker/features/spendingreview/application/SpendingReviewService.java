package com.expensetracker.features.spendingreview.application;

import com.expensetracker.features.spendingreview.domain.*;
import com.expensetracker.features.spendingreview.dto.SpendingReviewDtos.*;
import com.expensetracker.features.spendingreview.infrastructure.*;
import com.expensetracker.features.transaction.application.*;
import com.expensetracker.features.transaction.domain.Transaction;
import com.expensetracker.shared.error.ApiException;
import java.math.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SpendingReviewService {
    private final SpendingPreferencesRepository preferences;
    private final SpendingValueRuleRepository rules;
    private final TransactionReadService reads;
    private final TransactionService transactions;
    private final PersonalValueClassifier classifier;
    private final Clock clock;

    private String ruleId(String user, String description) {
        return UUID.nameUUIDFromBytes(
                        (user + ":" + PersonalValueClassifier.normalize(description))
                                .getBytes(StandardCharsets.UTF_8))
                .toString();
    }

    public SpendingPreferences preferences(String user) {
        return preferences
                .findById(user)
                .orElseGet(
                        () -> {
                            var p = new SpendingPreferences();
                            p.setId(user);
                            return p;
                        });
    }

    public SpendingPreferences updatePreferences(String user, Preferences input) {
        var p = preferences(user);
        p.setLearningEnabled(input.learningEnabled());
        p.setFoodGuideEnabled(input.foodGuideEnabled());
        return preferences.save(p);
    }

    public SpendingValueRule remember(String user, Rule input) {
        var key = PersonalValueClassifier.normalize(input.description());
        if (key.isBlank())
            throw ApiException.badRequest("Use letters or numbers in the description.");
        var id = ruleId(user, input.description());
        if (!rules.existsById(id) && rules.countByUser(user) >= 100)
            throw ApiException.badRequest(
                    "You can keep up to 100 spending preferences. Remove an unused one first.");
        var rule = new SpendingValueRule();
        rule.setId(id);
        rule.setUser(user);
        rule.setDescription(input.description().strip());
        rule.setNormalizedDescription(key);
        rule.setValue(input.value());
        rule.setUpdatedAt(clock.instant());
        return rules.save(rule);
    }

    public void removeRule(String user, String id) {
        rules.delete(
                rules.findByIdAndUser(id, user)
                        .orElseThrow(() -> ApiException.notFound("Spending preference")));
    }

    public Transaction rate(String user, String id, Rating input) {
        return transactions.reviewSpending(user, id, input.value());
    }

    public Suggestion suggest(String user, Suggest input) {
        var match = rules.findByIdAndUser(ruleId(user, input.description()), user);
        if (match.isPresent())
            return new Suggestion(
                    match.get().getValue(),
                    "your_rule",
                    "Matches a spending preference you explicitly saved for this description.",
                    PersonalValueClassifier.VERSION,
                    0,
                    1);
        var p = preferences(user);
        if (p.isLearningEnabled()) {
            var examples =
                    reads.spendingReviewExamples(user).stream()
                            .filter(t -> !Objects.equals(t.getId(), input.excludeTransactionId()))
                            .map(
                                    t ->
                                            new PersonalValueClassifier.Example(
                                                    t.getTitle(), t.getSpendingValue()))
                            .toList();
            var prediction = classifier.predict(input.description(), examples);
            // Conflicting exact feedback must not be hidden by a starter guide.
            if (prediction.value() != null
                    || prediction.explanation().startsWith("Your previous ratings"))
                return prediction;
            if (!p.isFoodGuideEnabled()) return prediction;
        }
        if (p.isFoodGuideEnabled()) return foodGuide(input.description());
        return PersonalValueClassifier.unknown(
                "Choose your own rating, or enable learning and starter preferences in Analytics.",
                0);
    }

    private Suggestion foodGuide(String description) {
        String text = " " + PersonalValueClassifier.normalize(description) + " ";
        if (List.of("no", "not", "without", "refund").stream()
                .anyMatch(w -> text.contains(" " + w + " ")))
            return PersonalValueClassifier.unknown(
                    "This description needs context. Choose your own rating.", 0);
        boolean good =
                List.of(
                                "fruit",
                                "fruits",
                                "milk",
                                "vegetables",
                                "home food",
                                "home foods",
                                "home cooked",
                                "groceries")
                        .stream()
                        .anyMatch(w -> text.contains(" " + w + " "));
        boolean improve =
                List.of(
                                "ice cream",
                                "icecream",
                                "outside food",
                                "takeaway",
                                "takeout",
                                "fast food",
                                "restaurant",
                                "swiggy",
                                "zomato",
                                "chocolate",
                                "sweets",
                                "chips",
                                "cake")
                        .stream()
                        .anyMatch(w -> text.contains(" " + w + " "));
        if (good == improve)
            return PersonalValueClassifier.unknown(
                    "The starter preferences do not clearly cover this purchase. Please choose.",
                    0);
        return new Suggestion(
                good ? "good" : "improve",
                "starter_preferences",
                "From the everyday-food preferences you enabled. This is your spending preference, not nutritional advice; change it for any purchase.",
                PersonalValueClassifier.VERSION,
                0,
                0);
    }

    public Review summary(String user, String rawMonth) {
        YearMonth month;
        try {
            month = rawMonth == null ? YearMonth.now(clock) : YearMonth.parse(rawMonth);
        } catch (java.time.DateTimeException e) {
            throw ApiException.badRequest("Choose a month in YYYY-MM format.");
        }
        if (month.getYear() < 2000 || month.isAfter(YearMonth.now(clock)))
            throw ApiException.badRequest("Choose the current month or an earlier month.");
        var rows =
                reads
                        .range(
                                user,
                                month.atDay(1).atStartOfDay(clock.getZone()).toInstant(),
                                month.plusMonths(1)
                                        .atDay(1)
                                        .atStartOfDay(clock.getZone())
                                        .toInstant())
                        .stream()
                        .filter(t -> "expense".equals(t.getType()))
                        .filter(t -> !t.getDate().isAfter(clock.instant()))
                        .toList();
        var totals = new ArrayList<Total>();
        int reviewed = 0;
        for (var value : List.of("good", "fine", "improve", "unreviewed")) {
            var group =
                    rows.stream()
                            .filter(
                                    t ->
                                            value.equals(
                                                    t.getSpendingValue() == null
                                                            ? "unreviewed"
                                                            : t.getSpendingValue()))
                            .toList();
            var amount =
                    group.stream()
                            .map(t -> t.getAmount().abs())
                            .reduce(BigDecimal.ZERO, BigDecimal::add)
                            .setScale(2, RoundingMode.HALF_UP);
            totals.add(new Total(value, amount, group.size()));
            if (!value.equals("unreviewed")) reviewed += group.size();
        }
        var purchases =
                rows.stream()
                        .sorted(Comparator.comparing(Transaction::getDate).reversed())
                        .limit(15)
                        .map(
                                t ->
                                        new Purchase(
                                                t.getId(),
                                                t.getTitle(),
                                                t.getCategory(),
                                                t.getAmount().abs(),
                                                t.getDate().atZone(clock.getZone()).toLocalDate(),
                                                t.getSpendingValue()))
                        .toList();
        return new Review(
                month.toString(),
                clock.getZone().getId(),
                totals,
                reviewed,
                rows.size(),
                purchases,
                preferences(user),
                rules.findByUserOrderByUpdatedAtDesc(user));
    }
}
