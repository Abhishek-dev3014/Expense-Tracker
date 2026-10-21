FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -ntp dependency:go-offline
COPY src src
RUN --mount=type=cache,target=/root/.m2 mvn -B -ntp -DskipTests package

FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache socat \
    && addgroup -S app \
    && adduser -S app -G app
WORKDIR /app
COPY --from=build --chown=app:app /build/target/expense-tracker-api-1.0.0.jar app.jar
COPY --chown=app:app --chmod=755 docker-entrypoint.sh /app/docker-entrypoint.sh
USER app
ENV PORT=9000
EXPOSE 9000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
