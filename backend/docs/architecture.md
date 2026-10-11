# Backend architecture

## Decision: feature-first modular monolith

Expense Tracker has one Spring Boot deployment with ten business features. Feature-first packaging gives each area an identifiable owner and keeps its HTTP endpoints, use cases, data, and persistence close together. It also allows dependency boundaries to be checked automatically.

The old global `controller`, `service`, `repository`, `domain`, and `dto` packages have been replaced by feature-owned packages. There is no single universal company backend layout; this arrangement fits this application's current size and deployment model. It does not introduce separate processes, service discovery, or empty interfaces merely to create more layers.

## Ownership

| Feature | Responsibility | Other features used |
| --- | --- | --- |
| `auth` | Registration, login, authenticated profile endpoints | `user` (JWT infrastructure also uses user lookups) |
| `user` | Account persistence, profile, tutorial state, streak and badge updates | None |
| `transaction` | Income, expenses, imports, filtering, transaction reads and split persistence | None |
| `category` | User category names and built-in category handling | None |
| `budget` | Monthly limits and usage | `transaction` |
| `goal` | Savings goals and completion | None |
| `recurring` | Schedule management and idempotent occurrence processing | `transaction` |
| `split` | Expense sharing, requests, debt summaries and settlement | `transaction`, `user` |
| `analytics` | Dashboard, reports and spending insights | `transaction`, `budget` |
| `gamification` | Badge eligibility based on activity | `transaction`, `goal`, `user` |

`TransactionReadService` owns historical reads, calendar-month queries and money summaries. Budgets consume it directly; they no longer depend on analytics. `UserService` owns account data; authentication and JWT verification do not query user repositories directly. `GamificationService` computes achievements without coupling account persistence to goals or transactions.

## Layers inside a feature

- `api`: request mappings, validation entry points, HTTP status codes and authenticated principals. No direct MongoDB access.
- `application`: use-case orchestration and business rules. No servlet objects, controllers, or Spring MVC dependencies.
- `domain`: document models and core value records. No application, API, DTO, or repository dependencies. Spring Data mapping annotations are intentionally retained; these are persistence-aware domain models, not a claim of strict hexagonal architecture.
- `dto`: one named request/response record per file. Request DTOs whitelist writable fields. Response types are independent of repository implementation details.
- `infrastructure`: repository interfaces, MongoTemplate queries and atomic persistence operations. Accessible only from the same feature's application/infrastructure packages.

A feature gets only the directories it needs. For example, analytics has no database collection of its own, so it has no empty domain or infrastructure directory.

## Cross-cutting components

- `config`: configuration properties, security wiring, clocks, password encoding and MongoDB settings.
- `security`: stateless bearer-token verification/signing. Uses the user application service for account lookups.
- `integrations/ml`: bounded HTTP client for the Python category predictor and its fallback.
- `platform/health`: operational database readiness checks.
- `shared/error`: sanitized application errors and HTTP exception translation.
- `shared/persistence`: common document ID and audit fields.
- `shared/time` and `shared/validation`: narrowly scoped date/email helpers.

Do not put feature-specific rules into `shared`. Architecture tests keep `shared` independent of business features.

## Enforced boundaries

[ArchitectureTest](../src/test/java/com/expensetracker/architecture/ArchitectureTest.java) uses [ArchUnit](https://www.archunit.org/userguide/html/000_Index.html) to enforce:

1. No cyclic dependencies between features.
2. No persistence access from controllers.
3. No controller/HTTP dependencies in business logic.
4. No application/transport dependencies in domain models.
5. No business-feature dependencies from shared building blocks.
6. No repository access outside the owning feature's application or infrastructure layer.

These rules are part of `./mvnw verify` and the existing CI workflow. They check compiled dependencies, not directory names alone.

## Adding a change

1. Identify the feature that owns the behavior. Add a new feature only for a separate business responsibility.
2. Add or update its named request/response DTOs and controller mapping when the API changes.
3. Put the use case in its application service. Reuse another feature through its application service instead of importing its repositories.
4. Keep database operations in the owning feature's infrastructure. Scope them to the authenticated user.
5. Put focused tests under the matching production package in `src/test/java`; use `integration` for cross-feature/API tests and `architecture` for dependency rules.
6. Run `./mvnw spotless:apply` followed by `./mvnw clean verify`.

No URLs, MongoDB collection names, credential settings or frontend contracts were changed by the reorganization. Stable document type aliases and a legacy `_class` compatibility test protect stored data against the package moves.

## Generated and local files

- `.mvn/`, `mvnw` and `mvnw.cmd` are required build tooling and belong in Git.
- `src/main` and `src/test` are the Maven source layout and must be kept.
- `target/` is generated output, ignored by Git. `./mvnw clean` removes it; the next build recreates it.
- `.env` is local configuration, intentionally untracked. Preserve it when cleaning the backend.
- `node_modules/` and the root Express folders do not belong in the Java backend and have been removed.
