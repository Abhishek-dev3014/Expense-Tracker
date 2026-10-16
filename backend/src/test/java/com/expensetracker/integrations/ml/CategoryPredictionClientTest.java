package com.expensetracker.integrations.ml;

import static org.assertj.core.api.Assertions.assertThat;

import com.expensetracker.config.AppProperties;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class CategoryPredictionClientTest {
    @Test
    void predictorUsesTheExistingPythonContractAndCleansPredictSuffix() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext(
                "/predict",
                exchange -> {
                    var request =
                            new String(
                                    exchange.getRequestBody().readAllBytes(),
                                    StandardCharsets.UTF_8);
                    assertThat(request).contains("text", "Bus fare");
                    assertThat(exchange.getRequestHeaders().getFirst("X-API-Key"))
                            .isEqualTo("test-service-key");
                    var response =
                            "{\"predicted_category\":\"Transport\",\"confidence\":0.92}"
                                    .getBytes(StandardCharsets.UTF_8);
                    exchange.getResponseHeaders().add("Content-Type", "application/json");
                    exchange.sendResponseHeaders(200, response.length);
                    exchange.getResponseBody().write(response);
                    exchange.close();
                });
        server.start();
        try {
            var properties =
                    new AppProperties(
                            "test-secret",
                            Duration.ofDays(7),
                            List.of("http://localhost:5173"),
                            "http://127.0.0.1:" + server.getAddress().getPort() + "/predict/",
                            "test-service-key",
                            Duration.ofSeconds(2),
                            "UTC");
            var prediction =
                    new CategoryPredictionClient(properties, JsonMapper.builder().build())
                            .predict("Bus fare");
            assertThat(prediction.category()).isEqualTo("Transport");
            assertThat(prediction.confidence()).isEqualTo(0.92);
        } finally {
            server.stop(0);
        }
    }

    @Test
    void batchingPreservesOrderAndReportsUncertaintyAndCredentialFailures() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext(
                "/predict/batch",
                exchange -> {
                    var body = JsonMapper.builder().build().readTree(exchange.getRequestBody());
                    assertThat(body.get("texts").get(0).asString()).isEqualTo("Uber travel");
                    assertThat(body.get("texts").get(1).asString()).isEqualTo("Unknown merchant");
                    assertThat(exchange.getRequestHeaders().getFirst("X-API-Key"))
                            .isEqualTo("test-service-key");
                    var response =
                            "{\"predictions\":[{\"predicted_category\":\"Transport\",\"confidence\":0.9},{\"predicted_category\":\"General\",\"confidence\":0,\"needs_review\":true}]}"
                                    .getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, response.length);
                    exchange.getResponseBody().write(response);
                    exchange.close();
                });
        server.createContext(
                "/predict",
                exchange -> {
                    exchange.sendResponseHeaders(401, -1);
                    exchange.close();
                });
        server.start();
        try {
            var properties =
                    new AppProperties(
                            "test-secret",
                            Duration.ofDays(7),
                            List.of("http://localhost:5173"),
                            "http://127.0.0.1:" + server.getAddress().getPort() + "/predict/",
                            "test-service-key",
                            Duration.ofSeconds(2),
                            "UTC");
            var client = new CategoryPredictionClient(properties, JsonMapper.builder().build());
            var predictions = client.predictAll(List.of("Uber travel", "Unknown merchant"));
            assertThat(predictions)
                    .extracting(CategoryPredictionClient.Prediction::category)
                    .containsExactly("Transport", "General");
            assertThat(predictions.get(0).status()).isEqualTo("predicted");
            assertThat(predictions.get(1).status()).isEqualTo("needs_review");
            assertThat(client.predict("Uber travel").status()).isEqualTo("unavailable");
        } finally {
            server.stop(0);
        }
    }
}
