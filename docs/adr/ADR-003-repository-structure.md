# ADR-003: Repository Structure and Project Organization

- **Status:** Accepted
- **Date:** 2026-06-20
- **Deciders:** León Nieves, [Nombre del colaborador]
- **Tags:** monorepo, project-structure, collaboration, tooling

---

## Context

The project consists of at least three distinct layers: an Angular frontend, a NestJS backend, and one or more MCP servers. We are two developers working in parallel and need a repository structure that:

- Minimizes friction when working across layers simultaneously.
- Enables shared TypeScript types and interfaces between frontend and backend without duplicating code.
- Supports independent deployment of each layer while keeping the codebase in a single repository for coordination ease.
- Is compatible with standard tooling and does not require complex build system expertise to set up or maintain.

---

## Decision

We will use a **single Git repository with a manual monorepo structure** (no build orchestration tool like Nx or Turborepo at this stage). The repository will be organized into top-level directories by concern, with a dedicated `shared` package for cross-layer types.

### Repository Layout

```
/
├── .github/
│   └── workflows/          # CI/CD pipelines (one per app)
├── docs/
│   └── adr/                # Architecture Decision Records (this folder)
├── frontend/               # Angular application
│   ├── src/
│   ├── angular.json
│   └── package.json
├── backend/                # NestJS application
│   ├── src/
│   ├── nest-cli.json
│   └── package.json
├── mcp-servers/            # MCP server processes
│   ├── [server-name]/      # One subdirectory per MCP server
│   │   ├── src/
│   │   └── package.json
│   └── ...
├── shared/                 # Shared TypeScript types, DTOs, enums
│   ├── src/
│   │   ├── types/
│   │   ├── enums/
│   │   └── index.ts
│   └── package.json
├── docker-compose.yml      # Local development environment
├── .env.example            # Environment variable template
└── README.md
```

### Key Conventions

1. **Shared types:** All TypeScript interfaces, enums, and DTOs used by more than one layer live in `/shared`. Both `frontend` and `backend` reference it via a local path dependency (`"@app/shared": "file:../shared"`).

2. **Independent `package.json` per app:** Each layer manages its own dependencies. There is no root-level `package.json` for dependency management (only optionally for workspace scripts).

3. **Docker Compose for local dev:** `docker-compose.yml` at the root orchestrates all services (MongoDB, backend, MCP servers) for local development. The frontend runs separately via `ng serve`.

4. **One branch strategy:** We use GitHub Flow — `main` is always deployable, all work happens in feature branches, merged via Pull Requests with at least one reviewer approval required.

5. **ADR-first for architectural decisions:** Any decision that affects more than one layer, introduces a new dependency to the stack, or changes a convention defined in an existing ADR must be documented as a new ADR (or an amendment to an existing one) before implementation begins.

6. **Environment configuration:** All secrets and environment-specific values are managed via `.env` files per app. `.env.example` files are committed; actual `.env` files are gitignored. No hardcoded secrets anywhere in the codebase.

---

## Consequences

### Positive
- **Low tooling overhead:** No Nx/Turborepo expertise required. Any developer can clone the repo and run each app independently.
- **Shared types without duplication:** The `/shared` package eliminates the risk of frontend and backend DTOs drifting out of sync.
- **Clear boundaries:** Each app directory is self-contained, making it straightforward to extract a layer into its own repo in the future if needed.
- **Collaboration-friendly:** Feature branches + PR reviews enforce peer review without requiring complex merge coordination.

### Negative / Trade-offs
- **No orchestrated builds:** Running `npm install` must be done per app (or scripted manually). A root-level script will be added to automate this.
- **Shared package versioning:** The `/shared` package is referenced via file path, not npm versioning. Changes to shared types are immediately reflected in all consumers — this is convenient but requires discipline to avoid breaking changes.
- **Monorepo tooling gap:** As the project grows, the lack of a build orchestrator (Nx/Turborepo) may become a bottleneck for caching builds or running affected-only tests. A future ADR can address this migration if needed.

### Neutral
- CI/CD pipelines are intentionally kept separate per app. Shared pipeline logic can be extracted into reusable GitHub Actions workflows under `.github/workflows/`.

---

## Alternatives Considered

| Option | Reason Rejected |
|---|---|
| Separate repositories per app | Cross-layer type sharing becomes painful; harder to coordinate changes that touch multiple layers |
| Nx monorepo | Powerful but introduces significant tooling complexity and a learning curve not justified at this project stage |
| Turborepo | Similar to Nx — valuable at scale, premature for a two-person early-stage project |
| Polyrepo with npm-published shared package | Publishing overhead and versioning complexity not justified at this stage |

---

## References

- [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)
- [npm workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces)
- [Conventional Commits](https://www.conventionalcommits.org/) — recommended commit message format
