package com.expensetracker.features.analytics.api;

import com.expensetracker.features.analytics.application.AnalyticsService;
import com.expensetracker.features.analytics.dto.DashboardResponse;
import com.expensetracker.features.user.domain.User;
import jakarta.validation.constraints.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Validated
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final AnalyticsService analytics;

    @GetMapping({"", "/"})
    public DashboardResponse overview(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "1") @Min(1) @Max(1000000) int page) {
        return analytics.overview(user.getId(), page);
    }
}
