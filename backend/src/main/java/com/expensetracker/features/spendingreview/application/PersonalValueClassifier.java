package com.expensetracker.features.spendingreview.application;

import com.expensetracker.features.spendingreview.dto.SpendingReviewDtos.Suggestion;
import java.text.Normalizer;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/** Account-local nearest-neighbour retrieval. Similarity is not a calibrated probability. */
@Component
public class PersonalValueClassifier {
    public static final String VERSION = "personal-value-knn-v1";

    public record Example(String description, String value) {}

    private record Neighbour(String value, double score) {}

    public static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFKC)
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{M}\\p{N}]+", " ")
                .strip()
                .replaceAll("\\s+", " ");
    }

    public Suggestion predict(String description, List<Example> input) {
        var groups =
                input.stream()
                        .filter(
                                e ->
                                        e.description() != null
                                                && !normalize(e.description()).isBlank())
                        .filter(
                                e ->
                                        List.of("good", "fine", "improve")
                                                .contains(e.value() == null ? "" : e.value()))
                        .collect(Collectors.groupingBy(e -> normalize(e.description())));
        var query = normalize(description);
        var direct = groups.get(query);
        if (direct != null) {
            if (direct.stream().map(Example::value).distinct().count() == 1)
                return new Suggestion(
                        direct.getFirst().value(),
                        "personal_history",
                        "You rated the same description this way. Confirm whether it still fits.",
                        VERSION,
                        groups.size(),
                        direct.size());
            return unknown(
                    "Your previous ratings for this description differ. Choose what fits this purchase.",
                    groups.size());
        }
        var examples =
                groups.entrySet().stream()
                        .filter(
                                e ->
                                        e.getValue().stream().map(Example::value).distinct().count()
                                                == 1)
                        .map(e -> new Example(e.getKey(), e.getValue().getFirst().value()))
                        .toList();
        if (examples.size() < 6 || examples.stream().map(Example::value).distinct().count() < 2)
            return unknown(
                    "Rate at least six different descriptions across two ratings to enable similar-purchase suggestions.",
                    examples.size());
        var neighbours =
                examples.stream()
                        .map(e -> new Neighbour(e.value(), similarity(query, e.description())))
                        .filter(n -> n.score() >= 0.45)
                        .sorted(Comparator.comparingDouble(Neighbour::score).reversed())
                        .toList();
        if (neighbours.size() < 2
                || neighbours.getFirst().score() < 0.60
                || !neighbours.get(0).value().equals(neighbours.get(1).value()))
            return unknown(
                    "There is not enough consistent personal evidence for a suggestion.",
                    examples.size());
        var winner = neighbours.getFirst();
        double alternative =
                neighbours.stream()
                        .filter(n -> !n.value().equals(winner.value()))
                        .mapToDouble(Neighbour::score)
                        .max()
                        .orElse(0);
        if (winner.score() - alternative < 0.15)
            return unknown(
                    "Similar purchases have competing ratings. Please choose.", examples.size());
        int support =
                (int)
                        neighbours.stream()
                                .limit(3)
                                .filter(n -> n.value().equals(winner.value()))
                                .count();
        return new Suggestion(
                winner.value(),
                "personal_model",
                "Similar purchases you reviewed support this suggestion. It is not a judgment about health or necessity.",
                VERSION,
                examples.size(),
                support);
    }

    public static Suggestion unknown(String reason, int n) {
        return new Suggestion(null, "needs_review", reason, VERSION, n, 0);
    }

    private static Set<String> words(String s) {
        return new HashSet<>(List.of(s.split(" ")));
    }

    private static Set<String> grams(String s) {
        var result = new HashSet<String>();
        s = "^" + s + "$";
        for (int i = 0; i + 3 <= s.length(); i++) result.add(s.substring(i, i + 3));
        return result;
    }

    private static double cosine(Set<String> a, Set<String> b) {
        if (a.isEmpty() || b.isEmpty()) return 0;
        long n = a.stream().filter(b::contains).count();
        return n / Math.sqrt((double) a.size() * b.size());
    }

    private static double similarity(String a, String b) {
        double w = cosine(words(a), words(b));
        return w == 0 ? 0 : 0.7 * w + 0.3 * cosine(grams(a), grams(b));
    }
}
