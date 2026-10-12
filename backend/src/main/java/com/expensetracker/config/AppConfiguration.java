package com.expensetracker.config;

import java.time.Clock;
import java.time.ZoneId;
import java.util.concurrent.TimeUnit;
import org.springframework.boot.mongodb.autoconfigure.MongoClientSettingsBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@EnableMongoAuditing
public class AppConfiguration {
    @Bean
    Clock clock(AppProperties properties) {
        return Clock.system(ZoneId.of(properties.timeZone()));
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    @Bean
    MongoCustomConversions mongoConversions() {
        return MongoCustomConversions.create(
                config ->
                        config.bigDecimal(
                                MongoCustomConversions.BigDecimalRepresentation.DECIMAL128));
    }

    @Bean
    MongoClientSettingsBuilderCustomizer mongoTimeouts() {
        return builder ->
                builder.applyToClusterSettings(
                                settings -> settings.serverSelectionTimeout(10, TimeUnit.SECONDS))
                        .applyToSocketSettings(
                                settings ->
                                        settings.connectTimeout(10, TimeUnit.SECONDS)
                                                .readTimeout(15, TimeUnit.SECONDS));
    }
}
