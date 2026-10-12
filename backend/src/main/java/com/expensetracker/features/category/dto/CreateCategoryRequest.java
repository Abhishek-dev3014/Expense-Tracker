package com.expensetracker.features.category.dto;

import jakarta.validation.constraints.*;
import java.util.*;

public record CreateCategoryRequest(
        @NotBlank @Size(max = 80) String name,
        @NotBlank @Pattern(regexp = "income|expense") String type) {}
