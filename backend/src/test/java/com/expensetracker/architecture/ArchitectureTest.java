package com.expensetracker.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.*;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

class ArchitectureTest {
    private static final String ROOT = "com.expensetracker";
    private static final JavaClasses CLASSES =
            new ClassFileImporter()
                    .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                    .importPackages(ROOT);

    @Test
    void featuresMustNotFormDependencyCycles() {
        slices().matching(ROOT + ".features.(*)..").should().beFreeOfCycles().check(CLASSES);
    }

    @Test
    void controllersMustUseApplicationServicesRatherThanPersistence() {
        noClasses()
                .that()
                .resideInAPackage("..api..")
                .should()
                .dependOnClassesThat()
                .resideInAnyPackage(
                        "..infrastructure..", "org.springframework.data..", "com.mongodb..")
                .check(CLASSES);
    }

    @Test
    void businessLogicMustNotDependOnControllersOrHttp() {
        noClasses()
                .that()
                .resideInAPackage("..application..")
                .should()
                .dependOnClassesThat()
                .resideInAnyPackage("..api..", "org.springframework.web..", "jakarta.servlet..")
                .check(CLASSES);
    }

    @Test
    void domainModelsMustNotDependOnApplicationOrTransportLayers() {
        noClasses()
                .that()
                .resideInAPackage("..domain..")
                .should()
                .dependOnClassesThat()
                .resideInAnyPackage(
                        "..application..",
                        "..api..",
                        "..dto..",
                        "..infrastructure..",
                        "jakarta.servlet..")
                .check(CLASSES);
    }

    @Test
    void sharedBuildingBlocksMustNotDependOnFeatures() {
        noClasses()
                .that()
                .resideInAPackage(ROOT + ".shared..")
                .should()
                .dependOnClassesThat()
                .resideInAPackage(ROOT + ".features..")
                .check(CLASSES);
    }

    @Test
    void persistenceMustBePrivateToItsOwningFeature() {
        var persistencePackage =
                Pattern.compile(
                        "com\\.expensetracker\\.features\\.([^.]+)\\.infrastructure(?:\\..*)?");
        classes()
                .should(
                        new ArchCondition<JavaClass>(
                                "access persistence only from its owning feature's application or infrastructure layer") {
                            @Override
                            public void check(JavaClass source, ConditionEvents events) {
                                for (var dependency : source.getDirectDependenciesFromSelf()) {
                                    var match =
                                            persistencePackage.matcher(
                                                    dependency.getTargetClass().getPackageName());
                                    if (!match.matches()) continue;
                                    String owner = ROOT + ".features." + match.group(1);
                                    String pkg = source.getPackageName();
                                    boolean allowed =
                                            pkg.equals(owner + ".application")
                                                    || pkg.startsWith(owner + ".application.")
                                                    || pkg.equals(owner + ".infrastructure")
                                                    || pkg.startsWith(owner + ".infrastructure.");
                                    if (!allowed)
                                        events.add(
                                                SimpleConditionEvent.violated(
                                                        source, dependency.getDescription()));
                                }
                            }
                        })
                .check(CLASSES);
    }
}
