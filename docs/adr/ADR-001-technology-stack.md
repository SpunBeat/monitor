# ADR-001: Technology Stack Selection

- **Status:** Accepted
- **Date:** 2026-06-20
- **Deciders:** León Nieves, [Nombre del colaborador]
- **Tags:** frontend, backend, database, api

---

## Context

We are starting a new collaborative application from scratch. We need to define the foundational technology choices for the frontend, backend, API layer, and database before any development begins. These decisions will influence the entire architecture, the hiring/collaboration profile, and the long-term maintainability of the project.

Both contributors have existing experience with JavaScript/TypeScript ecosystems and prefer a unified language across the stack to reduce context switching and share types/interfaces where possible.

---

## Decision

We will use the following technology stack:

### Frontend
- **Angular (latest stable)** — Component-based SPA framework with strong typing, dependency injection, and a mature ecosystem. Chosen for its opinionated structure, which facilitates consistency in a collaborative setting.

### Backend
- **NestJS** — Node.js framework built on top of Express, with first-class TypeScript support, a module system inspired by Angular, and built-in support for GraphQL via `@nestjs/graphql`. Its similarity to Angular's architecture reduces the cognitive overhead when switching between frontend and backend work.

### API Layer
- **GraphQL (Code-First approach with NestJS)** — Replaces REST for the primary API layer. Chosen for its strongly-typed schema, efficient data fetching (avoiding over/under-fetching), and native support for subscriptions, which will be needed for real-time features.

### Database
- **MongoDB (via Mongoose + `@nestjs/mongoose`)** — Document-oriented NoSQL database. Chosen for its schema flexibility during early-stage development, native JSON alignment with our GraphQL payloads, and ease of horizontal scaling.

### Language
- **TypeScript** — Used across all layers (frontend, backend, shared types/DTOs). Enforced with strict mode enabled.

---

## Consequences

### Positive
- **Unified language:** TypeScript across the entire stack reduces context switching and allows sharing of type definitions and validation schemas.
- **Structural consistency:** NestJS and Angular share architectural patterns (modules, decorators, DI), making it easier for both contributors to work on either layer.
- **Rapid schema iteration:** MongoDB's flexible documents accelerate development during the discovery phase when data models are still evolving.
- **GraphQL benefits:** Strongly-typed API contract between frontend and backend, auto-generated documentation, and fine-grained query control.

### Negative / Trade-offs
- **MongoDB lacks relational constraints:** If relational integrity becomes critical later (e.g., complex joins or transactions), a migration to PostgreSQL may be necessary.
- **GraphQL complexity overhead:** Compared to REST, GraphQL adds initial setup cost (resolvers, schema stitching, N+1 problem mitigation with DataLoader).
- **Angular bundle size:** Heavier initial load compared to lighter frameworks like Svelte or Vue; acceptable given our target use case is a feature-rich application, not a marketing site.

### Neutral
- A future decision may introduce a caching layer (Redis) or a message broker (RabbitMQ/CloudAMQP) — those will be addressed in separate ADRs once the need is confirmed.

---

## Alternatives Considered

| Option | Reason Rejected |
|---|---|
| React + Express | Less structural guidance; increases decision fatigue in a collaborative project |
| NestJS + REST | GraphQL better suits our dynamic querying needs and real-time features |
| PostgreSQL | MongoDB chosen for flexibility in early stage; revisit if relational integrity becomes critical |
| Vue / Svelte | Team lacks production experience; learning curve outweighs benefits at this stage |

---

## References

- [NestJS GraphQL Documentation](https://docs.nestjs.com/graphql/quick-start)
- [Angular Official Docs](https://angular.dev)
- [Mongoose + NestJS Integration](https://docs.nestjs.com/techniques/mongodb)
