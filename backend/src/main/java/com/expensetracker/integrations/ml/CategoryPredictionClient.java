package com.expensetracker.integrations.ml;

import com.expensetracker.config.AppProperties;
import java.net.URI;
import java.net.http.*;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

@Service
@Slf4j
public class CategoryPredictionClient {
    public record Prediction(String category, double confidence) {}

    private final AppProperties properties;
    private final ObjectMapper mapper;
    private final HttpClient client;

    public CategoryPredictionClient(AppProperties properties, ObjectMapper mapper) {
        this.properties = properties;
        this.mapper = mapper;
        this.client = HttpClient.newBuilder().connectTimeout(properties.mlTimeout()).build();
    }

    public Prediction predict(String text) {
        try {
            String base =
                    properties
                            .mlServiceUrl()
                            .strip()
                            .replaceAll("/+$", "")
                            .replaceAll("/predict$", "");
            var request =
                    HttpRequest.newBuilder(URI.create(base + "/predict"))
                            .timeout(properties.mlTimeout())
                            .header("Content-Type", "application/json")
                            .POST(
                                    HttpRequest.BodyPublishers.ofString(
                                            mapper.writeValueAsString(Map.of("text", text))));
            if (properties.mlServiceApiKey() != null && !properties.mlServiceApiKey().isBlank()) {
                request.header("X-API-Key", properties.mlServiceApiKey().strip());
            }
            var response = client.send(request.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                var data = mapper.readTree(response.body());
                String category = data.path("predicted_category").asString("");
                double confidence = data.path("confidence").asDouble(0);
                if (!category.isBlank() && category.length() <= 40 && Double.isFinite(confidence))
                    return new Prediction(category, Math.max(0, Math.min(1, confidence)));
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            log.warn("Category prediction unavailable: {}", e.getClass().getSimpleName());
        }
        return new Prediction("General", 0);
    }
}
