package com.expensetracker.features.auth.dto;

import jakarta.validation.constraints.*;
import java.util.*;

public record LoginRequest(
        @NotBlank @Email String email, @NotBlank @Size(max = 72) String password) {}
