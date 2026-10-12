package com.expensetracker.features.split.application;

import com.expensetracker.features.split.domain.SplitRequest;
import com.expensetracker.features.split.dto.DebtResponse;
import com.expensetracker.features.split.dto.IouResponse;
import com.expensetracker.features.split.dto.RespondSplitRequest;
import com.expensetracker.features.split.dto.SendSplitRequest;
import com.expensetracker.features.split.dto.SplitParticipantRequest;
import com.expensetracker.features.split.dto.SplitSummaryResponse;
import com.expensetracker.features.split.dto.UpdateSplitsRequest;
import com.expensetracker.features.split.infrastructure.SplitRequestRepository;
import com.expensetracker.features.transaction.application.TransactionReadService;
import com.expensetracker.features.transaction.application.TransactionService;
import com.expensetracker.features.transaction.domain.SplitDetail;
import com.expensetracker.features.transaction.domain.Transaction;
import com.expensetracker.features.user.application.UserService;
import com.expensetracker.features.user.domain.User;
import com.expensetracker.shared.error.ApiException;
import com.expensetracker.shared.validation.EmailAddresses;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SplitService {
    private final SplitRequestRepository requests;
    private final TransactionReadService transactions;
    private final TransactionService transactionService;
    private final UserService users;
    private final Clock clock;

    public SplitSummaryResponse summary(User user) {
        var debts = new ArrayList<DebtResponse>();
        var ious = new ArrayList<IouResponse>();
        for (var tx : transactions.all(user.getId())) {
            if (tx.getSplitDetails() == null) continue;
            for (var split : tx.getSplitDetails())
                if ("pending".equals(split.getStatus()))
                    debts.add(
                            new DebtResponse(
                                    tx.getId(),
                                    tx.getTitle(),
                                    split.getName(),
                                    split.getAmount(),
                                    tx.getDate()));
        }
        for (var request :
                requests.findByToEmailAndStatusIn(
                        user.getEmail(), List.of("pending", "accepted"))) {
            var sender = users.findById(request.getFromUser());
            var person =
                    sender.map(u -> u.getName() == null ? u.getEmail() : u.getName())
                            .orElse("Former user");
            ious.add(
                    new IouResponse(
                            request.getId(),
                            request.getTransactionTitle(),
                            person,
                            request.getAmount(),
                            request.getStatus(),
                            request.getDate()));
        }
        return new SplitSummaryResponse(debts, ious);
    }

    public SplitRequest send(User user, SendSplitRequest input) {
        var request = new SplitRequest();
        request.setFromUser(user.getId());
        request.setToEmail(EmailAddresses.normalize(input.toEmail()));
        request.setAmount(input.amount());
        request.setTransactionTitle(input.transactionTitle().strip());
        request.setDate(clock.instant());
        return requests.insert(request);
    }

    public SplitRequest respond(User user, String id, RespondSplitRequest input) {
        var request =
                requests.findByIdAndToEmail(id, user.getEmail())
                        .orElseThrow(() -> ApiException.notFound("Request"));
        if (!"pending".equals(request.getStatus()))
            throw ApiException.badRequest("Only pending requests can be accepted or rejected.");
        request.setStatus(input.status());
        return requests.save(request);
    }

    public SplitRequest settleSocial(User user, String id) {
        var request =
                requests.findById(id)
                        .filter(
                                r ->
                                        user.getId().equals(r.getFromUser())
                                                || user.getEmail().equals(r.getToEmail()))
                        .orElseThrow(() -> ApiException.notFound("Request"));
        if ("rejected".equals(request.getStatus()))
            throw ApiException.badRequest("A rejected request cannot be settled.");
        request.setStatus("settled");
        return requests.save(request);
    }

    public Transaction split(String user, String id, UpdateSplitsRequest input) {
        var tx = transactionService.owned(user, id);
        if (!"expense".equals(tx.getType()))
            throw ApiException.badRequest("Only expenses can be split.");
        var total =
                input.splits().stream()
                        .map(SplitParticipantRequest::amount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (total.compareTo(tx.getAmount().abs()) > 0)
            throw ApiException.badRequest("Split amounts cannot exceed the expense total.");
        var names = new HashSet<String>();
        var splits = new ArrayList<SplitDetail>();
        for (var inputSplit : input.splits()) {
            if (!names.add(inputSplit.name().strip()))
                throw ApiException.badRequest("Use a unique name for each split.");
            var split = new SplitDetail();
            split.setName(inputSplit.name().strip());
            split.setEmail(inputSplit.email());
            split.setAmount(inputSplit.amount());
            split.setStatus(inputSplit.status() == null ? "pending" : inputSplit.status());
            splits.add(split);
        }
        tx.setSplitDetails(splits);
        return transactionService.updateSplits(user, id, tx.getSplitDetails());
    }

    public Transaction settle(String user, String id, String name) {
        var tx = transactionService.owned(user, id);
        var split =
                tx.getSplitDetails().stream()
                        .filter(s -> s.getName().equals(name))
                        .findFirst()
                        .orElseThrow(() -> ApiException.notFound("Split"));
        split.setStatus("settled");
        return transactionService.updateSplits(user, id, tx.getSplitDetails());
    }
}
