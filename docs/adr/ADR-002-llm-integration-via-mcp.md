# ADR-002: LLM Integration via Model Context Protocol (MCP)

- **Status:** Accepted
- **Date:** 2026-06-20
- **Deciders:** León Nieves, [Nombre del colaborador]
- **Tags:** ai, llm, mcp, integration, agents

---

## Context

The application requires integration with a Large Language Model (LLM) to enable AI-powered features. We need a standardized, maintainable approach to connect our backend to one or more LLM providers without tightly coupling our codebase to a specific vendor's SDK.

We also anticipate that the AI features will evolve over time — starting simple and potentially growing into multi-step agentic workflows. The integration strategy must accommodate this evolution without requiring large architectural rewrites.

---

## Decision

We will integrate with LLMs using the **Model Context Protocol (MCP)** as the primary communication layer between our NestJS backend and LLM providers.

### Architecture

```
Angular Frontend
      │
      │ GraphQL
      ▼
NestJS Backend (MCP Host)
      │
      │ MCP Protocol (stdio / SSE / HTTP)
      ▼
MCP Server(s)
      │
      ├── LLM Provider (e.g., Anthropic Claude, OpenAI GPT)
      ├── Tool: Database queries
      ├── Tool: External API calls
      └── Tool: File / document processing
```

### Implementation Approach

1. **NestJS as MCP Host:** The backend will act as the MCP host, orchestrating communication with one or more MCP servers. A dedicated `AiModule` (NestJS module) will encapsulate all MCP-related logic.

2. **MCP Servers as isolated processes:** Each MCP server runs as an isolated process (stdio transport for local dev, SSE/HTTP for production). This decouples LLM tooling from the core application.

3. **Tool exposure via MCP:** Application capabilities that the LLM needs access to (e.g., querying the database, calling external APIs) will be exposed as MCP Tools — not called directly by the LLM.

4. **Provider abstraction:** The LLM provider (e.g., Anthropic, OpenAI) is configured via environment variables. Swapping providers requires only a configuration change, not code changes.

5. **Streaming support:** MCP's SSE transport will be used to stream LLM responses back to the frontend via GraphQL Subscriptions.

### NestJS Module Structure

```
src/
└── ai/
    ├── ai.module.ts
    ├── ai.resolver.ts          # GraphQL resolver exposing AI endpoints
    ├── ai.service.ts           # Orchestration logic (prompt building, MCP calls)
    ├── mcp/
    │   ├── mcp-client.service.ts   # MCP client singleton
    │   └── mcp.config.ts           # Server definitions and transport config
    └── dto/
        ├── ai-request.input.ts
        └── ai-response.model.ts
```

---

## Consequences

### Positive
- **Vendor agnostic:** Switching from Anthropic to OpenAI (or running both simultaneously) requires only a config change at the MCP server level.
- **Separation of concerns:** LLM orchestration is fully contained in the `AiModule`; the rest of the application has no direct dependency on any LLM SDK.
- **Extensible tooling:** New capabilities can be exposed to the LLM by adding MCP tools without modifying the core business logic.
- **Agentic-ready:** MCP natively supports multi-step tool calling, making it straightforward to evolve from simple LLM responses to autonomous agentic workflows.
- **Standardized protocol:** MCP is an open protocol with growing ecosystem support, reducing lock-in to any single vendor's integration approach.

### Negative / Trade-offs
- **Added complexity:** MCP introduces an additional process boundary between the NestJS app and the LLM. Debugging requires understanding the MCP protocol layer.
- **Latency overhead:** The extra hop through the MCP server adds latency compared to a direct SDK call. Acceptable for conversational AI; may need caching for high-frequency queries.
- **Ecosystem maturity:** MCP tooling is still evolving. Some edge cases (error handling, auth across transports) may require custom implementation.

### Neutral
- A specific LLM provider will be confirmed in a separate decision (or environment configuration). This ADR intentionally leaves provider selection open.
- If agentic workflows become complex, a dedicated orchestration library (e.g., LangChain.js, Mastra) may be evaluated in a future ADR.

---

## Alternatives Considered

| Option | Reason Rejected |
|---|---|
| Direct Anthropic/OpenAI SDK calls | Tight vendor coupling; swapping providers requires code changes |
| LangChain.js without MCP | MCP preferred for standardization and better tool isolation |
| Frontend calling LLM directly | Exposes API keys; no server-side control over prompts or tool execution |
| Serverless function per LLM call | Increases infra complexity without meaningful benefit at this stage |

---

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [Anthropic MCP Documentation](https://docs.anthropic.com/en/docs/agents-and-tools/mcp)
- [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
