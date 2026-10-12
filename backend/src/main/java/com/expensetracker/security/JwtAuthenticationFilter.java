package com.expensetracker.security;

import com.auth0.jwt.exceptions.JWTVerificationException;
import com.expensetracker.features.user.application.UserService;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final UserService users;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return List.of("/api/auth/signup", "/api/auth/login", "/api/health", "/actuator/health")
                .contains(request.getServletPath());
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                var id = jwt.verify(header.substring(7));
                var user = users.findById(id).orElse(null);
                if (user == null) {
                    error(response, 401, "Invalid or expired session. Please sign in again.");
                    return;
                }
                SecurityContextHolder.getContext()
                        .setAuthentication(
                                new UsernamePasswordAuthenticationToken(user, null, List.of()));
            } catch (JWTVerificationException | IllegalArgumentException e) {
                error(response, 401, "Invalid or expired session. Please sign in again.");
                return;
            } catch (DataAccessException e) {
                error(response, 503, "The service is reconnecting. Please try again shortly.");
                return;
            }
        }
        chain.doFilter(request, response);
    }

    public static void error(HttpServletResponse response, int status, String message)
            throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }
}
