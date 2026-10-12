package com.expensetracker.features.split.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;

public record UpdateSplitsRequest(
        @NotNull @Size(max = 100) List<@Valid SplitParticipantRequest> splits) {}
