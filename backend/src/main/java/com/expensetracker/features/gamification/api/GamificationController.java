package com.expensetracker.features.gamification.api;

import com.expensetracker.features.gamification.application.GamificationService;
import com.expensetracker.features.gamification.dto.BadgesResponse;
import com.expensetracker.features.user.application.UserService;
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
@RequestMapping("/api/gamification")
public class GamificationController {

    private final UserService users;
    private final GamificationService gamification;

    @GetMapping("/status")
    public Map<String, Object> status(@AuthenticationPrincipal User user) {
        var current = users.profile(user.getId());
        var response = new LinkedHashMap<String, Object>();
        response.put("_id", current.getId());
        response.put("streakCount", current.getStreakCount());
        response.put("lastLoginDate", current.getLastLoginDate());
        response.put("badges", current.getBadges());
        return response;
    }

    @PostMapping("/check-streak")
    public Map<String, Integer> streak(@AuthenticationPrincipal User user) {
        return Map.of("streakCount", users.streak(user.getId()));
    }

    @PostMapping("/sync-badges")
    public BadgesResponse badges(@AuthenticationPrincipal User user) {
        return gamification.badges(user.getId());
    }
}
