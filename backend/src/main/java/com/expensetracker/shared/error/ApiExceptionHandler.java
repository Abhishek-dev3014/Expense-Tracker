package com.expensetracker.shared.error;

import jakarta.validation.ConstraintViolationException;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@Slf4j
@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ApiException.class)
    ResponseEntity<?> business(ApiException e) {
        return ResponseEntity.status(e.getStatus()).body(Map.of("message", e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validation(MethodArgumentNotValidException e) {
        var errors =
                e.getBindingResult().getFieldErrors().stream()
                        .map(f -> f.getField() + ": " + f.getDefaultMessage())
                        .distinct()
                        .toList();
        return ResponseEntity.badRequest()
                .body(Map.of("message", "Please check the submitted fields.", "errors", errors));
    }

    @ExceptionHandler({
        HttpMessageNotReadableException.class,
        ConstraintViolationException.class,
        MethodArgumentTypeMismatchException.class,
        MissingServletRequestParameterException.class,
        IllegalArgumentException.class
    })
    ResponseEntity<?> invalid(Exception e) {
        return ResponseEntity.badRequest()
                .body(Map.of("message", "Invalid request. Check the submitted values."));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<?> missing(Exception e) {
        return ResponseEntity.status(404).body(Map.of("message", "Endpoint not found."));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<?> method(Exception e) {
        return ResponseEntity.status(405).body(Map.of("message", "HTTP method not allowed."));
    }

    @ExceptionHandler(DuplicateKeyException.class)
    ResponseEntity<?> duplicate(Exception e) {
        return ResponseEntity.status(409).body(Map.of("message", "This record already exists."));
    }

    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<?> database(Exception e) {
        log.warn("Database request unavailable: {}", e.getClass().getSimpleName());
        return ResponseEntity.status(503)
                .body(Map.of("message", "The service is reconnecting. Please try again shortly."));
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> status(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode())
                .body(Map.of("message", "Request could not be completed."));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<?> unexpected(Exception e) {
        log.error("Unhandled request failure: {}", e.getClass().getSimpleName());
        return ResponseEntity.internalServerError()
                .body(
                        Map.of(
                                "message",
                                "We couldn’t complete your request. Please try again shortly."));
    }
}
