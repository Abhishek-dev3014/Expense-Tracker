package com.expensetracker.features.auth.api;

import com.expensetracker.features.auth.application.AuthService;
import com.expensetracker.features.auth.dto.LoginRequest;
import com.expensetracker.features.auth.dto.SignupRequest;
import com.expensetracker.features.user.application.UserService;
import com.expensetracker.features.user.domain.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Validated
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;
    private final UserService users;

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> signup(@Valid @RequestBody SignupRequest input) {
        return Map.of("token", auth.signup(input));
    }

    @PostMapping("/login")
    public Map<String, String> login(@Valid @RequestBody LoginRequest input) {
        return Map.of("token", auth.login(input));
    }

    @GetMapping("/profile")
    public User profile(@AuthenticationPrincipal User user) {
        return users.profile(user.getId());
    }

    @PostMapping("/complete-tutorial")
    public User tutorial(@AuthenticationPrincipal User user) {
        return users.tutorial(user.getId());
    }
}
