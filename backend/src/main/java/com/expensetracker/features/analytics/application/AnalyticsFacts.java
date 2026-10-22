package com.expensetracker.features.analytics.application;

import com.expensetracker.features.analytics.domain.AnalyticsCoverage;
import com.expensetracker.features.analytics.dto.PlanningResponse.*;
import com.expensetracker.features.transaction.domain.Transaction;
import java.math.*;
import java.text.Normalizer;
import java.time.*;
import java.util.*;

/** Pure accounting helpers shared by every planning method. No I/O or model calls. */
public final class AnalyticsFacts {
    private AnalyticsFacts() {}

    public static BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    public static LocalDate date(Transaction tx, ZoneId zone) {
        return tx.getDate().atZone(zone).toLocalDate();
    }

    public static String key(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFKC)
                .strip()
                .replaceAll("(?U)\\s+", " ")
                .toLowerCase(Locale.ROOT);
    }

    public static String category(Transaction tx) {
        return tx.getCategory() == null ? "Other" : tx.getCategory();
    }

    public static boolean expense(Transaction tx) {
        return "expense".equals(tx.getType());
    }

    public static List<Transaction> between(
            List<Transaction> all, LocalDate from, LocalDate through, ZoneId zone) {
        return all.stream()
                .filter(
                        t ->
                                t.getDate() != null
                                        && !date(t, zone).isBefore(from)
                                        && !date(t, zone).isAfter(through))
                .toList();
    }

    public static BigDecimal sum(List<Transaction> txs, String type) {
        return money(
                txs.stream()
                        .filter(t -> type.equals(t.getType()))
                        .map(t -> t.getAmount().abs())
                        .reduce(BigDecimal.ZERO, BigDecimal::add));
    }

    public static boolean covered(AnalyticsCoverage coverage, LocalDate from, LocalDate through) {
        return coverage != null
                && coverage.getFrom() != null
                && coverage.getThrough() != null
                && !coverage.getFrom().isAfter(from)
                && !coverage.getThrough().isBefore(through);
    }

    public static List<Category> categories(List<Transaction> txs) {
        Map<String, List<Transaction>> groups = new TreeMap<>();
        txs.stream()
                .filter(AnalyticsFacts::expense)
                .forEach(t -> groups.computeIfAbsent(category(t), k -> new ArrayList<>()).add(t));
        return groups.entrySet().stream()
                .map(
                        e ->
                                new Category(
                                        e.getKey(),
                                        sum(e.getValue(), "expense"),
                                        e.getValue().size()))
                .sorted(
                        Comparator.comparing(Category::amount)
                                .reversed()
                                .thenComparing(Category::name))
                .toList();
    }

    public static BigDecimal median(List<BigDecimal> values) {
        var sorted = values.stream().sorted().toList();
        int n = sorted.size();
        if (n == 0) return BigDecimal.ZERO;
        return n % 2 == 1
                ? sorted.get(n / 2)
                : sorted.get(n / 2 - 1).add(sorted.get(n / 2)).divide(BigDecimal.valueOf(2));
    }

    public static List<Evidence> evidence(List<Transaction> txs, ZoneId zone) {
        return txs.stream()
                .sorted(Comparator.comparing(Transaction::getDate).reversed())
                .limit(6)
                .map(
                        t ->
                                new Evidence(
                                        t.getId(),
                                        t.getTitle(),
                                        money(t.getAmount()),
                                        date(t, zone),
                                        category(t)))
                .toList();
    }

    public static String id(String value) {
        return UUID.nameUUIDFromBytes(value.getBytes(java.nio.charset.StandardCharsets.UTF_8))
                .toString();
    }
}
