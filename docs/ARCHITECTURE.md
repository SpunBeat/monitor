# ARCHITECTURE.md

> Single source of truth for architectural decisions. All significant changes to the stack, structure, or integration patterns must be reflected here and documented as a new ADR in `docs/adr/`.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [API Layer — GraphQL](#2-api-layer--graphql)
3. [Database](#3-database)
4. [LLM Integration via MCP](#4-llm-integration-via-mcp)
5. [Repository Structure](#5-repository-structure)
6. [Collaboration Conventions](#6-collaboration-conventions)
7. [What NOT To Do](#7-what-not-to-do)
8. [ADR Index](#8-adr-index)

---

## 1. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | Angular | Latest stable |
| Backend | NestJS | Latest stable |
| API | GraphQL (code-first) | via `@nestjs/graphql` |
| Database | MongoDB | via Mongoose + `@nestjs/mongoose` |
| Language | TypeScript (strict mode) | All layers |
| LLM Integration | MCP (Model Context Protocol) | stdio / SSE |

TypeScript strict mode is enforced across all layers. Shared types and DTOs live in `/shared` — never duplicated between frontend and backend.

---

## 2. API Layer — GraphQL

We use GraphQL as the **sole API layer** between frontend and backend, following the **code-first** approach in NestJS (schema is generated from TypeScript decorators, not written by hand).

**Key decisions:**
- Resolvers live in their corresponding NestJS feature module (e.g., `UsersModule` has `users.resolver.ts`).
- Use `DataLoader` to mitigate N+1 query problems whenever a resolver fetches related documents.
- Real-time features use **GraphQL Subscriptions** (not polling).
- The Angular frontend uses Apollo Client for queries, mutations, and subscriptions.

---

## 3. Database

MongoDB is the primary database, accessed via Mongoose. Schema flexibility is intentional at this stage — we are in an early discovery phase where data models are still evolving.

**Key decisions:**
- Each NestJS feature module owns its Mongoose schema and repository logic. No global database service.
- Schema validation is enforced at the application level (class-validator + NestJS pipes), not only at the database level.
- If relational integrity requirements grow significantly, a migration to PostgreSQL will be evaluated and documented as a new ADR.

---

## 4. LLM Integration via MCP

The backend acts as an **MCP Host**. All communication with LLMs goes through one or more MCP Servers, which are isolated processes. No layer calls an LLM provider SDK directly.

### Architecture Flow

```
Angular Frontend
      │
      │  GraphQL (query / mutation / subscription)
      ▼
NestJS Backend  ──── AiModule (MCP Host)
      │
      │  MCP Protocol (stdio local / SSE production)
      ▼
MCP Server(s)
      ├── LLM Provider  (Anthropic / OpenAI — config only)
      ├── Tool: DB queries
      ├── Tool: External API calls
      └── Tool: Document / file processing
```

### NestJS AiModule Structure

```
src/
└── ai/
    ├── ai.module.ts
    ├── ai.resolver.ts          # GraphQL entry point for AI features
    ├── ai.service.ts           # Prompt building + MCP orchestration
    ├── mcp/
    │   ├── mcp-client.service.ts
    │   └── mcp.config.ts       # Server definitions + transport config
    └── dto/
        ├── ai-request.input.ts
        └── ai-response.model.ts
```

**LLM provider** (Anthropic, OpenAI, etc.) is selected via environment variable — swapping providers requires no code changes.

---

## 5. Repository Structure

Single Git repository, manual monorepo structure (no Nx/Turborepo at this stage).

```
/
├── .github/
│   └── workflows/          # CI/CD — one pipeline per app
├── docs/
│   ├── adr/                # Architecture Decision Records
│   └── ARCHITECTURE.md     # This file
├── frontend/               # Angular application
│   ├── src/
│   ├── angular.json
│   └── package.json
├── backend/                # NestJS application
│   ├── src/
│   ├── nest-cli.json
│   └── package.json
├── mcp-servers/            # MCP server processes
│   └── [server-name]/
│       ├── src/
│       └── package.json
├── shared/                 # Cross-layer TypeScript types, DTOs, enums
│   ├── src/
│   │   ├── types/
│   │   ├── enums/
│   │   └── index.ts
│   └── package.json
├── docker-compose.yml      # Local dev environment
├── .env.example            # Committed — actual .env files are gitignored
└── README.md
```

`/shared` is referenced via local path dependency in both `frontend` and `backend`:
```json
"@app/shared": "file:../shared"
```

---

## 6. Collaboration Conventions

- **Branching:** GitHub Flow — `main` is always deployable. All work in feature branches, merged via Pull Request with at least one approval.
- **Commits:** Follow [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, etc.
- **Environment secrets:** Never committed. Use `.env` files per app (gitignored). `.env.example` is always kept up to date.
- **ADR-first rule:** Any decision that changes the stack, introduces a new dependency, or alters a pattern documented here must be written as an ADR before implementation.
- **Shared types:** Changes to `/shared` that break existing consumers must be coordinated between both developers before merging.

---

## 7. What NOT To Do

These are explicit anti-patterns for this project. Violating these requires a new ADR justifying the exception.

### General
- ❌ **Do not hardcode secrets or API keys** anywhere in the codebase — not in source files, not in comments, not in test fixtures.
- ❌ **Do not commit `.env` files** — only `.env.example` is committed.
- ❌ **Do not bypass the ADR process** for architectural changes. "We'll document it later" means it never gets documented.

### Frontend (Angular)
- ❌ **Do not call the backend directly with REST** — all API communication goes through GraphQL via Apollo Client.
- ❌ **Do not duplicate types from `/shared`** — import from `@app/shared`, never redefine what already exists there.
- ❌ **Do not manage global state with plain services holding `BehaviorSubject` chains** — use a proper state management approach (NgRx, or signals-based state) for anything that crosses more than two components.

### Backend (NestJS)
- ❌ **Do not call LLM provider SDKs directly** (Anthropic SDK, OpenAI SDK, etc.) from services or resolvers — all LLM communication goes through the `AiModule` via MCP.
- ❌ **Do not write raw MongoDB queries outside of Mongoose models** — keep all DB access inside the feature module's repository/service.
- ❌ **Do not expose internal implementation details through the GraphQL schema** — DTOs and GraphQL types are public contracts; keep them decoupled from Mongoose documents.
- ❌ **Do not skip validation pipes** — all incoming GraphQL inputs must go through `class-validator` + `ValidationPipe`.

### MCP / AI
- ❌ **Do not let the frontend communicate with MCP servers directly** — the NestJS backend is the only MCP Host.
- ❌ **Do not put business logic inside MCP tool implementations** — tools are thin adapters; logic lives in NestJS services.
- ❌ **Do not hardcode the LLM provider** — provider selection must always come from environment configuration.

### Repository
- ❌ **Do not install shared dependencies in the root** of the repo unless they are workspace-level dev tools (e.g., Prettier, ESLint config).
- ❌ **Do not push directly to `main`** — all changes go through a Pull Request.
- ❌ **Do not introduce a new top-level package** (new app, new MCP server) without a corresponding ADR entry or update to this file.

---

## 8. ADR Index

| # | Title | Status |
|---|---|---|
| [ADR-001](./adr/ADR-001-technology-stack.md) | Technology Stack Selection | Accepted |
| [ADR-002](./adr/ADR-002-llm-integration-via-mcp.md) | LLM Integration via Model Context Protocol | Accepted |
| [ADR-003](./adr/ADR-003-repository-structure.md) | Repository Structure and Project Organization | Accepted |
