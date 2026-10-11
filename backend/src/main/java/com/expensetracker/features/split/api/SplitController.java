package com.expensetracker.features.split.api;

import com.expensetracker.features.split.application.SplitService;
import com.expensetracker.features.split.domain.SplitRequest;
import com.expensetracker.features.split.dto.RespondSplitRequest;
import com.expensetracker.features.split.dto.SendSplitRequest;
import com.expensetracker.features.split.dto.SplitSummaryResponse;
import com.expensetracker.features.split.dto.UpdateSplitsRequest;
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
@RequestMapping("/api/splits")
public class SplitController {

    private final SplitService splits;

    @GetMapping("/summary")
    public SplitSummaryResponse summary(@AuthenticationPrincipal User user) {
        return splits.summary(user);
    }

    @PostMapping("/send-request")
    @ResponseStatus(HttpStatus.CREATED)
    public SplitRequest send(
            @AuthenticationPrincipal User user, @Valid @RequestBody SendSplitRequest input) {
        return splits.send(user, input);
    }

    @PatchMapping("/respond-request/{id}")
    public SplitRequest respond(
            @AuthenticationPrincipal User user,
            @PathVariable @Pattern(regexp = "[a-fA-F0-9]{24}") String id,
            @Valid @RequestBody RespondSplitRequest input) {
        return splits.respond(user, id, input);
    }

    @PatchMapping("/settle-social/{id}")
    public SplitRequest settleSocial(
            @AuthenticationPrincipal User user,
            @PathVariable @Pattern(regexp = "[a-fA-F0-9]{24}") String id) {
        return splits.settleSocial(user, id);
    }

    @PostMapping("/split/{id}")
    public Map<String, Object> split(
            @AuthenticationPrincipal User user,
            @PathVariable @Pattern(regexp = "[a-fA-F0-9]{24}") String id,
            @Valid @RequestBody UpdateSplitsRequest input) {
        return Map.of(
                "message",
                "Split updated successfully",
                "transaction",
                splits.split(user.getId(), id, input));
    }

    @PostMapping("/settle/{txId}/{name}")
    public Map<String, Object> settle(
            @AuthenticationPrincipal User user,
            @PathVariable @Pattern(regexp = "[a-fA-F0-9]{24}") String txId,
            @PathVariable String name) {
        return Map.of(
                "message",
                "Split marked as settled",
                "transaction",
                splits.settle(user.getId(), txId, name));
    }
}
