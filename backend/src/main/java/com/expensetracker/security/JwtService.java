package com.expensetracker.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.expensetracker.config.AppProperties;
import java.time.Clock;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private final Algorithm algorithm;
    private final AppProperties properties;
    private final Clock clock;

    public JwtService(AppProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
        this.algorithm = Algorithm.HMAC256(properties.jwtSecret());
    }

    public String issue(String userId) {
        return JWT.create()
                .withClaim("id", userId)
                .withSubject(userId)
                .withIssuedAt(clock.instant())
                .withExpiresAt(clock.instant().plus(properties.jwtTtl()))
                .sign(algorithm);
    }

    public String verify(String token) {
        // The former Express tokens have an `id` claim and no issuer or expiration.
        var decoded = JWT.require(algorithm).build().verify(token);
        var id = decoded.getClaim("id").asString();
        if (id == null || !ObjectId.isValid(id))
            throw new IllegalArgumentException("Invalid subject");
        return id;
    }
}
