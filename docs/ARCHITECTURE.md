# ARCHITECTURE.md

> Single source of truth for architectural decisions. All significant changes to the stack, structure, or integration patterns must be reflected here and documented as a new ADR in `docs/adr/`.

---

## Table of Contents

1. [Application Domain](#1-application-domain)
2. [Tech Stack](#2-tech-stack)
3. [API Layer — GraphQL & Real-Time](#3-api-layer--graphql--real-time)
4. [Database](#4-database)
5. [LLM Integration via MCP](#5-llm-integration-via-mcp)
6. [Repository Structure](#6-repository-structure)
7. [Cloud Infrastructure — GCP](#7-cloud-infrastructure--gcp)
8. [Collaboration Conventions](#8-collaboration-conventions)
9. [What NOT To Do](#9-what-not-to-do)
10. [ADR Index](#10-adr-index)

---

## 1. Application Domain

This is a **real-time server monitoring application**. It displays live metrics from the backend server itself: CPU load, RAM usage, disk usage, network I/O, and HTTP request latency. All metrics are streamed to the frontend as they are collected — there is no polling from the client side.

### Phase 1 — Internal monitoring (current scope)
- The backend monitors **its own process and host system** using the `systeminformation` Node.js library.
- Metrics are emitted as **GraphQL Subscriptions** over WebSocket (`graphql-ws`).
- Historical snapshots are stored in MongoDB for charts and trend analysis.

### Phase 2 — External server monitoring (future scope)
- Users will be able to register external servers to monitor (via ping or a lightweight agent).
- This will require a new ADR defining the agent protocol, data ingestion pipeline, and multi-server subscription model.
- **Do not design for Phase 2 now.** Architecture decisions that only make sense for Phase 2 will be deferred until that phase begins.

---

## 2. Tech Stack

| Layer | Technology | Key Packages |
|---|---|---|
| Frontend | Angular (latest stable) | `@angular/material`, `apollo-angular`, `graphql-ws` |
| Backend | NestJS | `@nestjs/graphql`, `@nestjs/mongoose`, `systeminformation`, `graphql-ws` |
| API | GraphQL — code-first | `@apollo/server`, `graphql` |
| Database | MongoDB | `mongoose` |
| Language | TypeScript (strict) | All layers |
| LLM Integration | MCP (Model Context Protocol) | stdio / SSE transport |

### Dark Mode
Angular Material's theming system handles dark/light mode. On app init:
1. Auto-detect: if the user's local time is between 19:00–07:00, dark mode activates automatically.
2. A `mat-slide-toggle` in the toolbar lets the user override at any time.
3. The preference is persisted in `localStorage`.

---

## 3. API Layer — GraphQL & Real-Time

GraphQL is the **sole API layer**. No REST endpoints exist in this application.

### Real-Time Data Flow

```
systeminformation  (runs inside NestJS process, polls every N seconds)
      │
      ▼
MetricsService  →  PubSub (in-memory, NestJS)
      │
      ▼
MetricsResolver  @Subscription()
      │
      │  graphql-ws  (WebSocket)
      ▼
Apollo Client  (Angular)
      │
      ▼
Dashboard components  (Angular Material cards + charts)
```

### Rules
- All queries, mutations, and subscriptions are **code-first** — TypeScript decorators generate the schema. No `.graphql` files.
- Resolvers live inside their feature module (e.g., `MetricsModule` owns `metrics.resolver.ts`).
- `DataLoader` is used wherever a resolver fetches related MongoDB documents to prevent N+1 queries.
- The Angular frontend uses **Apollo Client** for all three operation types (query, mutation, subscription).
- WebSocket reconnection on the client must be handled gracefully — Cloud Run connections have a 60-minute timeout.

---

## 4. Database

MongoDB stores:
- **Metric snapshots** — periodic captures of CPU, RAM, disk, network metrics for historical charts.
- **Alert configurations** — thresholds and notification rules (future).
- **User preferences** — dark mode override, refresh intervals, etc.

### Rules
- Each NestJS feature module owns its Mongoose schema. No global DB service.
- Validation happens at the application layer (`class-validator` + `ValidationPipe`), not only at the DB level.
- Time-series metric documents use a **capped collection or TTL index** to auto-expire old snapshots and keep storage bounded.

---

## 5. LLM Integration via MCP

The backend is the **MCP Host**. All LLM communication goes through isolated MCP Server processes. No layer calls an LLM provider SDK directly.

### Architecture

```
Angular Frontend
      │  GraphQL
      ▼
NestJS Backend — AiModule (MCP Host)
      │  MCP Protocol (stdio local / SSE production)
      ▼
MCP Server(s)
      ├── LLM Provider  (configured via env var)
      ├── Tool: metrics query
      ├── Tool: alert analysis
      └── Tool: external API calls
```

### AiModule Structure

```
src/
└── ai/
    ├── ai.module.ts
    ├── ai.resolver.ts
    ├── ai.service.ts
    ├── mcp/
    │   ├── mcp-client.service.ts
    │   └── mcp.config.ts
    └── dto/
        ├── ai-request.input.ts
        └── ai-response.model.ts
```

LLM provider is selected via environment variable. Swapping providers requires no code changes.

---

## 6. Repository Structure

Single Git repository, manual monorepo (no Nx/Turborepo at this stage).

```
/
├── .github/
│   └── workflows/              # CI/CD — one pipeline per app
├── docs/
│   ├── adr/                    # Architecture Decision Records
│   └── ARCHITECTURE.md         # This file
├── frontend/                   # Angular application
│   ├── src/
│   ├── angular.json
│   └── package.json
├── backend/                    # NestJS application
│   ├── src/
│   │   ├── metrics/            # Core monitoring module
│   │   │   ├── metrics.module.ts
│   │   │   ├── metrics.resolver.ts
│   │   │   ├── metrics.service.ts  # systeminformation calls
│   │   │   └── metrics.schema.ts   # Mongoose schema for snapshots
│   │   ├── ai/                 # MCP Host + LLM orchestration
│   │   └── app.module.ts
│   ├── nest-cli.json
│   └── package.json
├── mcp-servers/                # MCP server processes
│   └── [server-name]/
│       ├── src/
│       └── package.json
├── shared/                     # Cross-layer TypeScript types, DTOs, enums
│   ├── src/
│   │   ├── types/
│   │   │   └── metrics.types.ts    # MetricSnapshot, CpuMetric, RamMetric…
│   │   ├── enums/
│   │   └── index.ts
│   └── package.json
├── docker-compose.yml          # Local: MongoDB + backend + MCP servers
├── .env.example                # Root-level env template
└── README.md
```

`/shared` is referenced via local path dependency:
```json
"@app/shared": "file:../shared"
```

---

## 7. Cloud Infrastructure — GCP

| Need | GCP Service |
|---|---|
| Backend (NestJS) | Cloud Run |
| MCP Servers | Cloud Run (one service per server) |
| Frontend (Angular) | Firebase Hosting |
| Container Registry | Artifact Registry |
| Database | MongoDB Atlas (`us-central1`) |
| Secrets | Secret Manager |
| CI/CD | Cloud Build + GitHub trigger |
| Logs & Monitoring | Cloud Logging + Cloud Monitoring |

### Deployment Flow

```
GitHub (main)
      │
      ▼
Cloud Build ──► Artifact Registry
      ├──► Cloud Run — backend
      └──► Cloud Run — mcp-[name]

Firebase Hosting ◄── Angular static build

Cloud Run (backend)
      ├── Secret Manager
      ├── MongoDB Atlas (us-central1)
      └── Cloud Run MCP (internal, IAM-secured)
```

### Secrets Strategy

All secrets injected at deploy time via `--set-secrets`. No secrets in `.env` files in CI or in Docker image layers.

```bash
gcloud run deploy backend \
  --image us-central1-docker.pkg.dev/PROJECT_ID/repo/backend:latest \
  --set-secrets="MONGODB_URI=mongodb-uri:latest,JWT_SECRET=jwt-secret:latest" \
  --region us-central1
```

> **Note:** Cloud Run exposes container-level metrics (CPU, memory) via Cloud Monitoring natively. In Phase 1 these complement (not replace) the `systeminformation` metrics emitted by the application itself.

---

## 8. Collaboration Conventions

- **Branching:** GitHub Flow — `main` always deployable. All work in feature branches, merged via PR with at least one approval.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
- **Secrets:** Never committed. `.env` files are gitignored. `.env.example` always kept up to date.
- **ADR-first:** Any decision that changes the stack, adds a top-level dependency, or alters a convention here must be an ADR before implementation.
- **Shared types:** Breaking changes to `/shared` must be coordinated between both developers before merging.
- **Phase gate:** Phase 2 features (external server monitoring) do not get designed or scaffolded until Phase 1 is stable and deployed.

---

## 9. What NOT To Do

Explicit anti-patterns. Violating these requires a new ADR justifying the exception.

### General
- ❌ **Do not hardcode secrets or API keys** anywhere — not in source, comments, or test fixtures.
- ❌ **Do not commit `.env` files** — only `.env.example` is committed.
- ❌ **Do not bypass the ADR process** for architectural changes.
- ❌ **Do not build Phase 2 features** (multi-server, external ping) during Phase 1.

### Frontend (Angular)
- ❌ **Do not use REST** — all communication goes through GraphQL via Apollo Client.
- ❌ **Do not poll** for metrics from the frontend — use GraphQL Subscriptions.
- ❌ **Do not duplicate types from `/shared`** — import from `@app/shared`.
- ❌ **Do not manage cross-component state with raw `BehaviorSubject` chains** — use Angular signals or NgRx Signals Store for shared state.
- ❌ **Do not hardcode dark mode** — it must respect both the auto timezone rule and the user's manual override.

### Backend (NestJS)
- ❌ **Do not call LLM SDKs directly** — all LLM communication goes through `AiModule` via MCP.
- ❌ **Do not read system metrics outside of `MetricsService`** — `systeminformation` calls are centralized there.
- ❌ **Do not expose Mongoose documents directly in GraphQL responses** — always map to a DTO/model class.
- ❌ **Do not skip `ValidationPipe`** — all GraphQL inputs must be validated.
- ❌ **Do not let metric snapshots grow unbounded in MongoDB** — enforce TTL indexes from day one.

### MCP / AI
- ❌ **Do not let the frontend communicate with MCP servers directly.**
- ❌ **Do not put business logic inside MCP tools** — tools are thin adapters.
- ❌ **Do not hardcode the LLM provider** — always from env config.

### Repository
- ❌ **Do not push directly to `main`.**
- ❌ **Do not install cross-app dependencies at the repo root** (only workspace dev tooling: Prettier, ESLint config).
- ❌ **Do not add a new top-level package** without an ADR or update to this file.

---

## 10. ADR Index

| # | Title | Status |
|---|---|---|
| [ADR-001](./adr/ADR-001-technology-stack.md) | Technology Stack Selection | Accepted |
| [ADR-002](./adr/ADR-002-llm-integration-via-mcp.md) | LLM Integration via Model Context Protocol | Accepted |
| [ADR-003](./adr/ADR-003-repository-structure.md) | Repository Structure and Project Organization | Accepted |
| [ADR-004](./adr/ADR-004-cloud-provider-gcp.md) | Cloud Provider Selection — GCP | Accepted |
