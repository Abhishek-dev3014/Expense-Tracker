package com.expensetracker.features.analytics.api;

import com.expensetracker.features.analytics.application.AnalyticsService;
import com.expensetracker.features.analytics.dto.MonthlyReportResponse;
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
@RequestMapping("/api/reports")
public class ReportsController {

    private final AnalyticsService analytics;

    @GetMapping("/monthly")
    public MonthlyReportResponse monthly(
            @AuthenticationPrincipal User user,
            @RequestParam @Min(1) @Max(12) int month,
            @RequestParam @Min(1900) @Max(9999) int year) {
        return analytics.report(user.getId(), year, month);
    }
}
