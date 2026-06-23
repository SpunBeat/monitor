# monitor

Real-time server monitoring application. The backend collects live metrics (CPU, RAM, disk, network, HTTP latency) and streams them to an Angular dashboard via GraphQL Subscriptions.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Angular, Angular Material, Apollo Client |
| Backend | NestJS, GraphQL (code-first), systeminformation |
| Database | MongoDB (Mongoose) |
| LLM | MCP (Model Context Protocol) |
| Cloud | GCP (Cloud Run, Firebase Hosting, MongoDB Atlas) |

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for full architectural decisions.

## Local development

Start MongoDB:

```bash
docker compose up -d
```

MongoDB is available at `mongodb://localhost:27017`. Copy `backend/.env.example` to `backend/.env` and adjust values as needed before running the backend (once scaffolded).
