package com.expensetracker.features.transaction.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;

public record ImportTransactionsRequest(
        @NotEmpty @Size(max = 1000) List<@Valid CreateTransactionRequest> transactions) {}
