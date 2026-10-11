package com.expensetracker.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.expensetracker.features.recurring.application.RecurringService;
import com.expensetracker.features.transaction.domain.Transaction;
import de.bwaldvogel.mongo.MongoServer;
import de.bwaldvogel.mongo.backend.memory.MemoryBackend;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "spring.config.import=",
            "spring.profiles.active=prod",
            "FRONTEND_URL=https://app.example.com",
            "app.time-zone=UTC",
            "app.ml-timeout=50ms",
            "app.ml-service-url=http://127.0.0.1:1"
        })
@AutoConfigureMockMvc
class ApiIntegrationTest {
    static final String SECRET = "migration-test-secret-only-not-for-production";
    static final MongoServer DATABASE = new MongoServer(new MemoryBackend());
    static final java.net.InetSocketAddress ADDRESS = DATABASE.bind();

    static {
        // Existing Mongoose deployments already own these index names.
        try (var client =
                com.mongodb.client.MongoClients.create(
                        "mongodb://127.0.0.1:" + ADDRESS.getPort())) {
            var database = client.getDatabase("migration-test");
            database.getCollection("users")
                    .createIndex(
                            new Document("email", 1),
                            new com.mongodb.client.model.IndexOptions()
                                    .name("email_1")
                                    .unique(true));
            database.getCollection("splitrequests").createIndex(new Document("toEmail", 1));
        }
    }

    @DynamicPropertySource
    static void config(DynamicPropertyRegistry registry) {
        registry.add(
                "spring.mongodb.uri",
                () -> "mongodb://127.0.0.1:" + ADDRESS.getPort() + "/migration-test");
        registry.add("app.jwt-secret", () -> SECRET);
    }

    @org.springframework.beans.factory.annotation.Value("${local.server.port}")
    int port;

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired MongoTemplate mongo;
    @Autowired RecurringService recurring;

    @BeforeEach
    void clean() {
        for (String collection :
                List.of(
                        "users",
                        "transactions",
                        "categories",
                        "budgets",
                        "goals",
                        "recurringtransactions",
                        "splitrequests")) mongo.remove(new Query(), collection);
    }

    @AfterAll
    static void stopDatabase() {
        DATABASE.shutdownNow();
    }

    JsonNode call(MockHttpServletRequestBuilder request, String token, Object body, int status)
            throws Exception {
        if (token != null) request.header("Authorization", "Bearer " + token);
        if (body != null)
            request.contentType("application/json").content(json.writeValueAsString(body));
        var response =
                mvc.perform(request).andExpect(status().is(status)).andReturn().getResponse();
        return json.readTree(response.getContentAsString());
    }

    String signup(String email) throws Exception {
        return call(
                        post("/api/auth/signup"),
                        null,
                        Map.of("name", "Test User", "email", email, "password", "test-password"),
                        201)
                .get("token")
                .asString();
    }

    JsonNode expense(String token, String title, String category, int amount, String date)
            throws Exception {
        return call(
                post("/api/expense"),
                token,
                Map.of("title", title, "category", category, "amount", amount, "date", date),
                201);
    }

    String userId(String token) throws Exception {
        return call(get("/api/auth/profile"), token, null, 200).get("_id").asString();
    }

    @Test
    void authenticationAndTutorialPreserveTheFrontendContract() throws Exception {
        String token = signup("TEST@example.com");
        var user = call(get("/api/auth/profile"), token, null, 200);
        assertThat(user.get("email").asString()).isEqualTo("test@example.com");
        assertThat(user.has("password")).isFalse();
        assertThat(user.get("hasSeenTutorial").asBoolean()).isFalse();
        assertThat(
                        call(post("/api/auth/complete-tutorial"), token, Map.of(), 200)
                                .get("hasSeenTutorial")
                                .asBoolean())
                .isTrue();
        assertThat(
                        call(
                                        post("/api/auth/login"),
                                        null,
                                        Map.of(
                                                "email",
                                                "test@example.com",
                                                "password",
                                                "test-password"),
                                        200)
                                .get("token")
                                .asString())
                .isNotBlank();
        call(
                post("/api/auth/signup"),
                null,
                Map.of("name", "Other", "email", "test@example.com", "password", "password"),
                409);
        call(
                post("/api/auth/login"),
                null,
                Map.of("email", "test@example.com", "password", "wrong"),
                401);
        call(
                post("/api/auth/signup"),
                null,
                Map.of("name", "", "email", "bad", "password", "short"),
                400);
    }

    @Test
    void bcryptjsPasswordsExpressJwtAndMongooseObjectIdsRemainReadable() throws Exception {
        var fixture = json.readTree(getClass().getResourceAsStream("/express-auth-fixture.json"));
        var id = new ObjectId(fixture.get("id").asString());
        mongo.getCollection("users")
                .insertOne(
                        new Document("_id", id)
                                .append("name", "Existing User")
                                .append("email", fixture.get("email").asString())
                                .append("password", fixture.get("hash").asString()));
        mongo.getCollection("transactions")
                .insertOne(
                        new Document("_id", new ObjectId())
                                .append("user", id)
                                .append("title", "Existing expense")
                                .append("type", "expense")
                                .append("category", "Food")
                                .append("amount", -12.50)
                                .append("date", Date.from(Instant.parse("2026-01-10T00:00:00Z"))));
        var profile = call(get("/api/auth/profile"), fixture.get("token").asString(), null, 200);
        assertThat(profile.get("_id").asString()).isEqualTo(id.toHexString());
        assertThat(profile.get("hasSeenTutorial").asBoolean()).isFalse();
        call(
                post("/api/auth/login"),
                null,
                Map.of(
                        "email",
                        fixture.get("email").asString(),
                        "password",
                        fixture.get("password").asString()),
                200);
        var transactions =
                call(get("/api/transactions"), fixture.get("token").asString(), null, 200);
        assertThat(transactions.get("total").asInt()).isEqualTo(1);
        assertThat(transactions.get("transactions").get(0).get("amount").decimalValue())
                .isEqualByComparingTo("-12.50");
    }

    @Test
    void documentsWithOldJavaTypeHintsRemainReadableAfterPackageMoves() throws Exception {
        String token = signup("compatibility@example.com");
        String user = userId(token);
        mongo.getCollection("users")
                .updateOne(
                        new Document("_id", new ObjectId(user)),
                        new Document(
                                "$set", new Document("_class", "com.expensetracker.domain.User")));
        mongo.getCollection("transactions")
                .insertOne(
                        new Document("_id", new ObjectId())
                                .append("_class", "com.expensetracker.domain.Transaction")
                                .append("user", new ObjectId(user))
                                .append("title", "Before restructure")
                                .append("type", "expense")
                                .append("amount", -25.0)
                                .append("category", "Food")
                                .append("date", Date.from(Instant.parse("2026-01-01T00:00:00Z"))));
        assertThat(call(get("/api/transactions"), token, null, 200).get("total").asInt())
                .isEqualTo(1);
        var created = expense(token, "After restructure", "Food", 50, "2026-01-02");
        var raw =
                mongo.getCollection("transactions")
                        .find(new Document("_id", new ObjectId(created.get("_id").asString())))
                        .first();
        assertThat(raw.getString("_class")).isEqualTo("transactions");
    }

    @Test
    void bearerSecurityRejectsTamperedExpiredAndMissingTokens() throws Exception {
        call(get("/api/transactions"), null, null, 401);
        call(get("/api/transactions"), "not-a-jwt", null, 401);
        String token = signup("owner@example.com");
        String id = userId(token);
        String expired =
                JWT.create()
                        .withClaim("id", id)
                        .withExpiresAt(Instant.now().minusSeconds(60))
                        .sign(Algorithm.HMAC256(SECRET));
        String forged =
                JWT.create().withClaim("id", id).sign(Algorithm.HMAC256("a-different-secret"));
        call(get("/api/transactions"), expired, null, 401);
        call(get("/api/transactions"), forged, null, 401);
        call(get("/actuator/env"), token, null, 403);
    }

    @Test
    void transactionsNormalizeSignsValidatePayloadsFilterAndPaginate() throws Exception {
        String token = signup("owner@example.com");
        var tx = expense(token, "Coffee [special]", "Food", 150, "2026-01-31T23:59:59.999Z");
        assertThat(tx.get("amount").asInt()).isEqualTo(-150);
        assertThat(tx.get("date").asString()).isEqualTo("2026-01-31T23:59:59.999Z");
        call(
                post("/api/income"),
                token,
                Map.of("title", "Salary", "amount", 1000, "date", "2026-01-01"),
                201);
        expense(token, "February coffee", "Food", 200, "2026-02-01");
        var filtered =
                call(
                        get("/api/transactions")
                                .param("category", "Food")
                                .param("startDate", "2026-01-01")
                                .param("endDate", "2026-01-31"),
                        token,
                        null,
                        200);
        assertThat(filtered.get("total").asInt()).isEqualTo(1);
        assertThat(
                        call(
                                        get("/api/transactions").param("search", "[special]"),
                                        token,
                                        null,
                                        200)
                                .get("total")
                                .asInt())
                .isEqualTo(1);
        assertThat(
                        call(
                                        get("/api/transactions")
                                                .param("limit", "1")
                                                .param("page", "2"),
                                        token,
                                        null,
                                        200)
                                .get("totalPages")
                                .asInt())
                .isEqualTo(3);
        call(get("/api/transactions").param("page", "0"), token, null, 400);
        call(get("/api/transactions").param("startDate", "broken"), token, null, 400);
        call(post("/api/expense"), token, Map.of("title", "Invalid", "amount", -1), 400);
        call(post("/api/expense"), token, Map.of("title", "Invalid", "amount", "NaN"), 400);
        call(delete("/api/transactions/" + tx.get("_id").asString()), token, null, 200);
        assertThat(call(get("/api/transactions"), token, null, 200).get("total").asInt())
                .isEqualTo(2);
    }

    @Test
    void importSupportsBothPathsAndValidatesWholeBatchBeforeWriting() throws Exception {
        String token = signup("owner@example.com");
        var payload =
                Map.of(
                        "transactions",
                        List.of(
                                Map.of(
                                        "title",
                                        "Imported",
                                        "amount",
                                        50,
                                        "type",
                                        "expense",
                                        "date",
                                        "2026-01-01")));
        call(post("/api/transactions/batch"), token, payload, 201);
        call(post("/api/batch"), token, payload, 201);
        assertThat(call(get("/api/transactions"), token, null, 200).get("total").asInt())
                .isEqualTo(2);
        call(
                post("/api/transactions/batch"),
                token,
                Map.of(
                        "transactions",
                        List.of(
                                Map.of("title", "Valid", "amount", 50, "type", "expense"),
                                Map.of(
                                        "title", "Invalid", "amount", 50, "type", "expense", "date",
                                        "invalid"))),
                400);
        assertThat(call(get("/api/transactions"), token, null, 200).get("total").asInt())
                .isEqualTo(2);
    }

    @Test
    void ownerIsolationAppliesToTransactionsGoalsRecurringAndCategories() throws Exception {
        String alice = signup("alice@example.com"), bob = signup("bob@example.com");
        String id = expense(alice, "Private", "Food", 100, "2026-01-01").get("_id").asString();
        call(delete("/api/transactions/" + id), bob, null, 404);
        assertThat(call(get("/api/dashboard"), bob, null, 200).get("allTransactions").size())
                .isZero();
        String goal =
                call(post("/api/goals"), alice, Map.of("name", "Trip", "targetAmount", 500), 201)
                        .get("_id")
                        .asString();
        call(put("/api/goals/" + goal), bob, Map.of("currentAmount", 500), 404);
        call(
                put("/api/goals/" + goal),
                alice,
                Map.of("user", userId(bob), "currentAmount", 100),
                200);
        assertThat(call(get("/api/goals"), bob, null, 200).size()).isZero();
        assertThat(call(get("/api/goals"), alice, null, 200).size()).isEqualTo(1);
        String recurringId = createRecurring(alice, "2026-01-01");
        call(put("/api/recurring/" + recurringId), bob, Map.of("status", "paused"), 404);
        call(
                post("/api/categories"),
                alice,
                Map.of("name", "Private category", "type", "expense"),
                201);
        assertThat(
                        call(get("/api/categories").param("type", "expense"), bob, null, 200)
                                .get("categories")
                                .size())
                .isZero();
    }

    @Test
    void categoryNormalizationReusesBuiltInsAndCustomNames() throws Exception {
        String token = signup("owner@example.com");
        assertThat(
                        call(
                                        post("/api/categories"),
                                        token,
                                        Map.of("name", " fOoD ", "type", "expense"),
                                        201)
                                .get("name")
                                .asString())
                .isEqualTo("Food");
        call(
                post("/api/categories"),
                token,
                Map.of("name", "  Pet   care  ", "type", "expense"),
                201);
        call(post("/api/categories"), token, Map.of("name", "PET CARE", "type", "expense"), 201);
        var saved =
                call(get("/api/categories").param("type", "expense"), token, null, 200)
                        .get("categories");
        assertThat(saved.size()).isEqualTo(1);
        assertThat(saved.get(0).asString()).isEqualTo("Pet care");
        call(post("/api/categories"), token, Map.of("name", "a\u200bb", "type", "expense"), 400);
        call(get("/api/categories").param("type", "bad"), token, null, 400);
    }

    @Test
    void monthlyReportsKeepBoundariesPreviousMonthAndExactAmounts() throws Exception {
        String token = signup("owner@example.com");
        expense(token, "Previous", "Food", 40, "2025-12-31T23:59:59.999Z");
        expense(token, "First", "Food", 60, "2026-01-01T00:00:00Z");
        expense(token, "Last", "Food", 70, "2026-01-31T23:59:59.999Z");
        expense(token, "Next", "Food", 80, "2026-02-01T00:00:00Z");
        var report =
                call(
                        get("/api/reports/monthly").param("month", "1").param("year", "2026"),
                        token,
                        null,
                        200);
        assertThat(report.get("expense").asInt()).isEqualTo(130);
        assertThat(report.get("previousMonth").get("expense").asInt()).isEqualTo(40);
        assertThat(report.get("transactions").size()).isEqualTo(2);
        assertThat(report.get("breakdown").get(0).get("amount").asInt()).isEqualTo(130);
        call(
                get("/api/reports/monthly").param("month", "13").param("year", "2026"),
                token,
                null,
                400);
    }

    @Test
    void budgetUsesCurrentMonthAndUpsertsOneDocument() throws Exception {
        String token = signup("owner@example.com");
        var month = YearMonth.now(ZoneOffset.UTC);
        expense(token, "Current", "Food", 100, month.atDay(1).toString());
        expense(token, "Next", "Food", 200, month.plusMonths(1).atDay(1).toString());
        call(
                post("/api/budget"),
                token,
                Map.of("monthlyLimit", 500, "categoryLimits", Map.of("Food", 200)),
                200);
        var rawBudget = mongo.getCollection("budgets").find().first();
        assertThat(rawBudget.get("monthlyLimit")).isInstanceOf(org.bson.types.Decimal128.class);
        assertThat(rawBudget.get("categoryLimits", Document.class).get("Food"))
                .isInstanceOf(org.bson.types.Decimal128.class);
        call(post("/api/budget"), token, Map.of("monthlyLimit", 600), 200);
        var usage = call(get("/api/budget"), token, null, 200);
        assertThat(usage.get("used").asInt()).isEqualTo(100);
        assertThat(usage.get("remaining").asInt()).isEqualTo(500);
        assertThat(mongo.getCollection("budgets").countDocuments()).isEqualTo(1);
    }

    @Test
    void goalsRecalculateCompletionAndRejectNegativeContributions() throws Exception {
        String token = signup("owner@example.com");
        String id =
                call(
                                post("/api/goals"),
                                token,
                                Map.of("name", "Save", "targetAmount", "100.00", "deadline", ""),
                                201)
                        .get("_id")
                        .asString();
        assertThat(
                        call(put("/api/goals/" + id), token, Map.of("currentAmount", 100), 200)
                                .get("status")
                                .asString())
                .isEqualTo("completed");
        assertThat(
                        call(put("/api/goals/" + id), token, Map.of("targetAmount", 200), 200)
                                .get("status")
                                .asString())
                .isEqualTo("active");
        call(put("/api/goals/" + id), token, Map.of("currentAmount", -1), 400);
        call(delete("/api/goals/" + id), token, null, 200);
    }

    String createRecurring(String token, String startDate) throws Exception {
        return call(
                        post("/api/recurring"),
                        token,
                        Map.of(
                                "title",
                                "Rent",
                                "amount",
                                "100.00",
                                "category",
                                "Rent",
                                "type",
                                "expense",
                                "frequency",
                                "monthly",
                                "startDate",
                                startDate),
                        201)
                .get("_id")
                .asString();
    }

    @Test
    void recurringRetriesAndConcurrentProcessingDoNotDuplicateExpenses() throws Exception {
        String token = signup("owner@example.com");
        String owner = userId(token);
        Instant occurrence = Instant.now().minusSeconds(60);
        String id = createRecurring(token, occurrence.toString());
        try (var executor = Executors.newFixedThreadPool(4)) {
            var calls = new ArrayList<Callable<List<Transaction>>>();
            for (int i = 0; i < 4; i++) calls.add(() -> recurring.process(owner));
            for (var future : executor.invokeAll(calls)) future.get();
        }
        var all = call(get("/api/transactions"), token, null, 200);
        assertThat(all.get("total").asInt()).isEqualTo(1);
        assertThat(all.get("transactions").get(0).get("amount").asInt()).isEqualTo(-100);
        // Simulate a restart after the expense insert succeeded but advancing the schedule failed.
        mongo.getCollection("recurringtransactions")
                .updateOne(
                        new Document("_id", new ObjectId(id)),
                        new Document(
                                "$set", new Document("nextOccurrence", Date.from(occurrence))));
        call(post("/api/recurring/process"), token, Map.of(), 200);
        assertThat(call(get("/api/transactions"), token, null, 200).get("total").asInt())
                .isEqualTo(1);
        call(put("/api/recurring/" + id), token, Map.of("status", "paused"), 200);
        call(delete("/api/recurring/" + id), token, null, 200);
    }

    @Test
    void splitOwnershipAmountsSocialResponsesAndSettlementsWork() throws Exception {
        String alice = signup("alice@example.com"),
                bob = signup("bob@example.com"),
                eve = signup("eve@example.com");
        String tx = expense(alice, "Dinner", "Food", 100, "2026-01-01").get("_id").asString();
        call(
                post("/api/splits/split/" + tx),
                alice,
                Map.of("splits", List.of(Map.of("name", "Bob", "amount", 40))),
                200);
        assertThat(call(get("/api/splits/summary"), alice, null, 200).get("debts").size())
                .isEqualTo(1);
        call(
                post("/api/splits/split/" + tx),
                alice,
                Map.of("splits", List.of(Map.of("name", "Bob", "amount", 140))),
                400);
        call(post("/api/splits/settle/" + tx + "/Bob"), bob, Map.of(), 404);
        call(post("/api/splits/settle/" + tx + "/Bob"), alice, Map.of(), 200);
        String split =
                call(
                                post("/api/splits/send-request"),
                                alice,
                                Map.of(
                                        "toEmail",
                                        "BOB@example.com",
                                        "amount",
                                        40,
                                        "transactionTitle",
                                        "Dinner"),
                                201)
                        .get("_id")
                        .asString();
        assertThat(call(get("/api/splits/summary"), bob, null, 200).get("ious").size())
                .isEqualTo(1);
        call(patch("/api/splits/respond-request/" + split), eve, Map.of("status", "accepted"), 404);
        call(patch("/api/splits/respond-request/" + split), bob, Map.of("status", "accepted"), 200);
        call(patch("/api/splits/settle-social/" + split), eve, Map.of(), 404);
        call(patch("/api/splits/settle-social/" + split), bob, Map.of(), 200);
        assertThat(call(get("/api/splits/summary"), bob, null, 200).get("ious").size()).isZero();
    }

    @Test
    void streaksAndBadgesAreIdempotentAndNeverExposePasswords() throws Exception {
        String token = signup("owner@example.com");
        for (int i = 0; i < 2; i++)
            assertThat(
                            call(post("/api/gamification/check-streak"), token, Map.of(), 200)
                                    .get("streakCount")
                                    .asInt())
                    .isEqualTo(1);
        expense(token, "First", "Food", 1, "2026-01-01");
        assertThat(
                        call(post("/api/gamification/sync-badges"), token, Map.of(), 200)
                                .get("unlocked")
                                .size())
                .isEqualTo(1);
        assertThat(
                        call(post("/api/gamification/sync-badges"), token, Map.of(), 200)
                                .get("unlocked")
                                .size())
                .isZero();
        var status = call(get("/api/gamification/status"), token, null, 200);
        assertThat(status.get("badges").size()).isEqualTo(1);
        assertThat(status.has("password")).isFalse();
    }

    @Test
    void predictionOutageFallsBackWithoutLosingExpense() throws Exception {
        String token = signup("owner@example.com");
        var tx =
                call(
                        post("/api/expense"),
                        token,
                        Map.of("title", "Unclassified", "amount", 12),
                        201);
        assertThat(tx.get("category").asString()).isEqualTo("General");
        assertThat(tx.get("aiConfidence").asDouble()).isZero();
        assertThat(call(get("/api/insights"), token, null, 200).get("insights").size())
                .isPositive();
    }

    @Test
    void malformedRequestsUseActionableClientErrors() throws Exception {
        String token = signup("owner@example.com");
        call(get("/api/reports/monthly"), token, null, 400);
        call(get("/api/categories"), token, null, 400);
        call(get("/api/does-not-exist"), token, null, 404);
        call(delete("/api/auth/profile"), token, null, 405);
    }

    @Test
    void embeddedServerServesRealHttpRequests() throws Exception {
        var request =
                java.net.http.HttpRequest.newBuilder(
                                java.net.URI.create("http://127.0.0.1:" + port + "/api/health"))
                        .GET()
                        .build();
        var response =
                java.net.http.HttpClient.newHttpClient()
                        .send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(json.readTree(response.body()).get("status").asString()).isEqualTo("ok");
    }

    @Test
    void startupReusesExistingMongooseIndexes() {
        var emailIndexes =
                mongo.getCollection("users").listIndexes().into(new ArrayList<>()).stream()
                        .filter(index -> new Document("email", 1).equals(index.get("key")))
                        .toList();
        assertThat(emailIndexes).hasSize(1);
        assertThat(emailIndexes.getFirst().getString("name")).isEqualTo("email_1");
        assertThat(emailIndexes.getFirst().getBoolean("unique")).isTrue();
        var splitIndexes =
                mongo.getCollection("splitrequests").listIndexes().into(new ArrayList<>()).stream()
                        .filter(index -> new Document("toEmail", 1).equals(index.get("key")))
                        .toList();
        assertThat(splitIndexes).hasSize(1);
        assertThat(splitIndexes.getFirst().getString("name")).isEqualTo("toEmail_1");
    }

    @Test
    void healthAndCorsAllowOnlyConfiguredOrigins() throws Exception {
        call(get("/api/health"), null, null, 200);
        mvc.perform(
                        options("/api/transactions")
                                .header("Origin", "https://app.example.com")
                                .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(
                        header().string("Access-Control-Allow-Origin", "https://app.example.com"));
        mvc.perform(
                        options("/api/transactions")
                                .header("Origin", "http://localhost:5173")
                                .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
        mvc.perform(
                        options("/api/transactions")
                                .header("Origin", "http://localhost:5173.evil.example")
                                .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }
}
