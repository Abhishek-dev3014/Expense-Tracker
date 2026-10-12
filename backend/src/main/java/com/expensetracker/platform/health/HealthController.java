package com.expensetracker.platform.health;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class HealthController {
    private final HealthService health;

    @GetMapping("/api/health")
    public ResponseEntity<?> health() {
        return health.ready()
                ? ResponseEntity.ok(Map.of("status", "ok"))
                : ResponseEntity.status(503).body(Map.of("status", "starting"));
    }
}
