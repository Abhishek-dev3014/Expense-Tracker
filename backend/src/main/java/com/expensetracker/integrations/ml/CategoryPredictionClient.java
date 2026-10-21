package com.expensetracker.integrations.ml;

import com.expensetracker.config.AppProperties;
import java.net.URI;
import java.net.http.*;
import java.util.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
@Slf4j
public class CategoryPredictionClient {
    public record Prediction(String category, double confidence, String status) {}

    private static final Prediction UNAVAILABLE = new Prediction("General", 0, "unavailable");
    private final AppProperties properties;
    private final ObjectMapper mapper;
    private final HttpClient client;

    public CategoryPredictionClient(AppProperties properties, ObjectMapper mapper) {
        this.properties = properties;
        this.mapper = mapper;
        this.client = HttpClient.newBuilder().connectTimeout(properties.mlTimeout()).build();
    }

    public Prediction predict(String text) {
        var data = request("/predict", Map.of("text", text));
        return data == null ? UNAVAILABLE : parse(data);
    }

    /** A single bounded request avoids a timeout for every imported transaction. */
    public List<Prediction> predictAll(List<String> texts) {
        if (texts.isEmpty()) return List.of();
        var data = request("/predict/batch", Map.of("texts", texts));
        if (data != null) {
            var results = data.path("predictions");
            if (results.isArray() && results.size() == texts.size()) {
                var predictions = new ArrayList<Prediction>();
                results.forEach(result -> predictions.add(parse(result)));
                return predictions;
            }
            log.warn("Category prediction returned an invalid batch response");
        }
        return Collections.nCopies(texts.size(), UNAVAILABLE);
    }

    private Prediction parse(JsonNode data) {
        String category = data.path("predicted_category").asString("");
        double confidence = data.path("confidence").asDouble(Double.NaN);
        if (!category.isBlank() && category.length() <= 40 && Double.isFinite(confidence)) {
            boolean review =
                    data.path("needs_review").asBoolean(false) || "General".equals(category);
            return new Prediction(
                    review ? "General" : category,
                    review ? 0 : Math.max(0, Math.min(1, confidence)),
                    review ? "needs_review" : "predicted");
        }
        log.warn("Category prediction returned invalid category or confidence");
        return UNAVAILABLE;
    }

    private JsonNode request(String path, Map<String, ?> payload) {
        try {
            String base =
                    properties
                            .mlServiceUrl()
                            .strip()
                            .replaceAll("/+$", "")
                            .replaceAll("/predict$", "");
            var request =
                    HttpRequest.newBuilder(URI.create(base + path))
                            .timeout(properties.mlTimeout())
                            .header("Content-Type", "application/json")
                            .POST(
                                    HttpRequest.BodyPublishers.ofString(
                                            mapper.writeValueAsString(payload)));
            if (properties.mlServiceApiKey() != null && !properties.mlServiceApiKey().isBlank()) {
                request.header("X-API-Key", properties.mlServiceApiKey().strip());
            }
            var response = client.send(request.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) return mapper.readTree(response.body());
            // Do not log credentials, response bodies or personal transaction descriptions.
            log.warn(
                    "Category prediction HTTP {}; check ML_SERVICE_URL and ML_SERVICE_API_KEY",
                    response.statusCode());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            log.warn("Category prediction unavailable: {}", e.getClass().getSimpleName());
        }
        return null;
    }
}
