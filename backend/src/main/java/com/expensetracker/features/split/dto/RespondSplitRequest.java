package com.expensetracker.features.split.dto;

import jakarta.validation.constraints.*;
import java.util.*;

public record RespondSplitRequest(@NotBlank @Pattern(regexp = "accepted|rejected") String status) {}
