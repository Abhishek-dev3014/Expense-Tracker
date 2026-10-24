package com.expensetracker.features.spendingreview.application;

import static org.assertj.core.api.Assertions.*;

import com.expensetracker.features.spendingreview.application.PersonalValueClassifier.Example;
import java.util.*;
import org.junit.jupiter.api.Test;

class PersonalValueClassifierTest {
    final PersonalValueClassifier model = new PersonalValueClassifier();

    @Test
    void normalizesUnicodeSpacingAndPunctuationWithoutSubstringRules() {
        assertThat(PersonalValueClassifier.normalize("  ＭＩＬＫ,   packet! "))
                .isEqualTo("milk packet");
        assertThat(model.predict("Milk!", List.of(new Example(" milk ", "good"))).value())
                .isEqualTo("good");
    }

    @Test
    void abstainsOnConflictingRatingsInsteadOfSilentlyChoosingLatest() {
        var result =
                model.predict(
                        "Milk",
                        List.of(new Example("milk", "good"), new Example("Milk", "improve")));
        assertThat(result.value()).isNull();
        assertThat(result.explanation()).contains("differ");
    }

    @Test
    void duplicatesCannotSatisfyDistinctTrainingRequirements() {
        var rows = new ArrayList<Example>();
        for (int i = 0; i < 15; i++) rows.add(new Example("milk packet", "good"));
        assertThat(model.predict("milk bottle", rows).value()).isNull();
        assertThat(model.predict("milk bottle", rows).trainingExamples()).isEqualTo(1);
    }

    @Test
    void predictsAReviewedPatternAndAbstainsOnUnrelatedText() {
        var rows =
                List.of(
                        new Example("fresh milk packet", "good"),
                        new Example("fresh milk bottle", "good"),
                        new Example("home food lunch", "good"),
                        new Example("ice cream cone", "improve"),
                        new Example("restaurant burger", "improve"),
                        new Example("takeaway pizza", "improve"));
        var result = model.predict("fresh milk", rows);
        assertThat(result.value()).isEqualTo("good");
        assertThat(result.source()).isEqualTo("personal_model");
        assertThat(result.supportingExamples()).isGreaterThanOrEqualTo(2);
        assertThat(model.predict("train ticket", rows).value()).isNull();
    }

    @Test
    void missingTitlesAndInvalidLabelsCannotBecomeTrainingEvidence() {
        assertThat(
                        model.predict(
                                        "milk",
                                        List.of(
                                                new Example(null, "good"),
                                                new Example("???", "fine"),
                                                new Example("milk", "made_up")))
                                .trainingExamples())
                .isZero();
    }
}
