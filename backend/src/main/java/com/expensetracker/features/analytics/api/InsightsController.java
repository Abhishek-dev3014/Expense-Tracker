package com.expensetracker.features.analytics.api;

import com.expensetracker.features.analytics.application.AnalyticsService;
import com.expensetracker.features.analytics.dto.InsightsResponse;
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
@RequestMapping("/api/insights")
public class InsightsController {

    private final AnalyticsService analytics;

    @GetMapping({"", "/"})
    public InsightsResponse insights(@AuthenticationPrincipal User user) {
        return analytics.insights(user.getId());
    }
}
