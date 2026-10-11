package com.expensetracker.features.user.application;

import com.expensetracker.features.user.domain.User;
import com.expensetracker.features.user.infrastructure.UserOperations;
import com.expensetracker.features.user.infrastructure.UserRepository;
import com.expensetracker.shared.error.ApiException;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository users;
    private final UserOperations operations;
    private final Clock clock;

    public User profile(String id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("User"));
    }

    public User tutorial(String id) {
        return operations.completeTutorial(id);
    }

    public int streak(String id) {
        var user = profile(id);
        var today = LocalDate.now(clock);
        var last =
                user.getLastLoginDate() == null
                        ? null
                        : user.getLastLoginDate().atZone(clock.getZone()).toLocalDate();
        if (last != null && !last.isBefore(today)) return user.getStreakCount();
        int count = last != null && last.equals(today.minusDays(1)) ? user.getStreakCount() + 1 : 1;
        var updated =
                operations.streak(user, today.atStartOfDay(clock.getZone()).toInstant(), count);
        return updated == null ? profile(id).getStreakCount() : updated.getStreakCount();
    }

    public Optional<User> findById(String id) {
        return users.findById(id);
    }

    public Optional<User> findByEmail(String email) {
        return users.findByEmail(email);
    }

    public User createAccount(String name, String email, String passwordHash) {
        var user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(passwordHash);
        return users.insert(user);
    }

    public User addBadges(String id, List<String> badges) {
        return operations.addBadges(id, badges);
    }
}
