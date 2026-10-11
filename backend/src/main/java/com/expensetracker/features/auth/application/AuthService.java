package com.expensetracker.features.auth.application;

import com.expensetracker.features.auth.dto.LoginRequest;
import com.expensetracker.features.auth.dto.SignupRequest;
import com.expensetracker.features.user.application.UserService;
import com.expensetracker.security.JwtService;
import com.expensetracker.shared.error.ApiException;
import com.expensetracker.shared.validation.EmailAddresses;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserService users;
    private final PasswordEncoder passwords;
    private final JwtService jwt;

    public String signup(SignupRequest input) {
        try {
            return jwt.issue(
                    users.createAccount(
                                    input.name().trim(),
                                    EmailAddresses.normalize(input.email()),
                                    passwords.encode(input.password()))
                            .getId());
        } catch (DuplicateKeyException e) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "An account with this email already exists. Please sign in instead.");
        }
    }

    public String login(LoginRequest input) {
        var user = users.findByEmail(EmailAddresses.normalize(input.email())).orElse(null);
        if (user == null
                || user.getPassword() == null
                || !passwords.matches(input.password(), user.getPassword()))
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED, "Incorrect email or password. Please try again.");
        return jwt.issue(user.getId());
    }
}
