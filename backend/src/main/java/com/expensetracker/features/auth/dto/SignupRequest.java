package com.expensetracker.features.auth.dto;

import jakarta.validation.constraints.*;
import java.util.*;

public record SignupRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 6, max = 72) String password) {}
