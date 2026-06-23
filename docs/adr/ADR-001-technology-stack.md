# ADR-001: Technology Stack Selection

- **Status:** Accepted (amended 2026-06-22)
- **Date:** 2026-06-20
- **Last amended:** 2026-06-22 — added UI library, real-time transport, and monitoring packages
- **Deciders:** León Nieves, [Nombre del colaborador]
- **Tags:** frontend, backend, database, api, monitoring, realtime

---

## Context

We are building a **server monitoring application** that displays real-time metrics (RAM, CPU, disk, network, request latency) for our own backend server. The application requires a live data stream from server to client, a rich UI component library, and a unified TypeScript stack across all layers.

Both contributors have existing experience with the Angular + NestJS ecosystem and prefer to minimize context switching by sharing types and patterns across the stack.

---

## Decision

We will use the following technology stack:

### Frontend
- **Angular (latest stable)** — Component-based SPA framework with strong typing, dependency injection, and a mature ecosystem. Chosen for its opinionated structure, which facilitates consistency in a collaborative setting.
- **Angular Material** — Official UI component library for Angular. Provides a complete set of accessible, themeable components (cards, charts-ready containers, toolbars, toggles) without introducing a conflicting design system. Dark mode is supported natively via Angular Material theming.

### Backend
- **NestJS** — Node.js framework with first-class TypeScript support, a module system inspired by Angular, and built-in support for GraphQL via `@nestjs/graphql`. Architectural similarity to Angular reduces cognitive overhead when switching between layers.
- **`systeminformation`** — Cross-platform Node.js library for reading system metrics: CPU load, RAM usage, disk usage, network stats, and process info. Primary data source for all monitoring metrics in Phase 1.
- **NestJS Interceptor (custom)** — A global `LatencyInterceptor` will measure request/response time for all GraphQL operations and emit the data as a subscription event.

### API Layer
- **GraphQL (Code-First, NestJS)** — Sole API layer between frontend and backend. Chosen for its strongly-typed schema and native **Subscriptions** support, which is critical for streaming real-time metrics to the frontend.
- **`graphql-ws`** — WebSocket-based transport for GraphQL Subscriptions (replaces the deprecated `subscriptions-transport-ws`). Used on both NestJS (server) and Apollo Client (Angular) sides.
- **Apollo Client (Angular)** — GraphQL client for the frontend. Handles queries, mutations, and WebSocket-based subscriptions in a unified way.

### Database
- **MongoDB (via Mongoose + `@nestjs/mongoose`)** — Stores historical metric snapshots, alert configurations, and (in Phase 2) registered external servers. Document model fits the variable-shape nature of metric payloads across different server types.

### Language
- **TypeScript (strict mode)** — All layers. Shared types and DTOs live in `/shared`.

---

## Real-Time Data Flow

```
systeminformation (Node.js, runs in NestJS process)
      │
      │  polls every N seconds
      ▼
MetricsService (NestJS)
      │
      │  publishes to PubSub
      ▼
MetricsResolver — @Subscription()
      │
      │  graphql-ws (WebSocket)
      ▼
Apollo Client (Angular)
      │
      ▼
Dashboard components (Angular Material cards, charts)
```

---

## Dark Mode Strategy

Angular Material supports `prefers-color-scheme` via CSS media queries and manual theme switching via a class applied to the `<body>`. The implementation will:

1. On app init, detect the user's system preference **and** their local timezone. If timezone is UTC-6 to UTC-12 and local time is between 19:00–07:00, dark mode activates automatically.
2. A toggle button (Angular Material `mat-slide-toggle`) in the toolbar allows the user to override the automatic selection at any time. The preference is persisted in `localStorage`.

---

## Consequences

### Positive
- **Subscriptions-first:** `graphql-ws` + NestJS PubSub is a battle-tested pattern for real-time dashboards. No polling, no REST SSE workarounds.
- **`systeminformation` covers Phase 1 fully:** CPU, RAM, disk, network, and process metrics out of the box with a single well-maintained package.
- **Angular Material:** No custom design system to maintain. Dark mode theming is built in.
- **Unified TypeScript stack:** Shared types between frontend and backend via `/shared`.

### Negative / Trade-offs
- **WebSocket on Cloud Run:** Cloud Run supports WebSocket connections but has a maximum request timeout of 60 minutes. Long-lived subscription connections must handle reconnection gracefully on the client side.
- **`systeminformation` reads host metrics:** In a containerized environment (Docker, Cloud Run), some metrics (e.g., total host RAM) reflect the container's limits, not the underlying VM. This is documented behavior and acceptable for Phase 1.
- **GraphQL subscription complexity:** More setup than REST SSE, but the investment pays off when Phase 2 adds multiple monitored servers requiring independent streams.

### Neutral
- Phase 2 (monitoring external servers via ping/agent) will require a new ADR for the agent protocol and data ingestion strategy.
- A caching layer (Redis) for metric history may be introduced in a future ADR if MongoDB query latency becomes a bottleneck for historical charts.

---

## Alternatives Considered

| Option | Reason Rejected |
|---|---|
| REST + Server-Sent Events | Would require a parallel REST layer alongside GraphQL, splitting the API contract |
| WebSockets without GraphQL | Loses the typed schema and subscription model that GraphQL provides |
| `subscriptions-transport-ws` | Deprecated; `graphql-ws` is the current standard |
| Tailwind + custom components | More flexibility but more maintenance; Angular Material sufficient for a monitoring dashboard |
| `node-os-utils` / `os` module | Less complete than `systeminformation`; lacks disk I/O, network stats, and process-level detail |

---

## References

- [NestJS GraphQL Subscriptions](https://docs.nestjs.com/graphql/subscriptions)
- [graphql-ws](https://github.com/enisdenjo/graphql-ws)
- [systeminformation](https://systeminformation.io/)
- [Angular Material Theming](https://material.angular.io/guide/theming)
- [Apollo Client Subscriptions](https://www.apollographql.com/docs/react/data/subscriptions/)
