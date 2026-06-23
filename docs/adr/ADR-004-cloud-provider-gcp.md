# ADR-004: Cloud Provider Selection

- **Status:** Accepted
- **Date:** 2026-06-22
- **Deciders:** León Nieves, [Nombre del colaborador]
- **Tags:** cloud, infrastructure, deployment, gcp

---

## Context

The application requires a cloud provider for hosting the backend (NestJS), MCP servers, and serving the Angular frontend. We need to make this decision before scaffolding the project, as it directly affects how we structure environment variables, secrets management, container registry, CI/CD pipelines, and deployment configuration.

Both contributors are in an early learning phase with cloud infrastructure. One contributor (León) is actively pursuing the **GCP Associate Cloud Engineer** certification, making hands-on GCP experience a secondary but meaningful benefit of this decision.

We have an existing AWS account with ~$100 USD in remaining credits, but the free tier has already expired (April 27, 2026). A new GCP account provides $300 USD in free credits valid for 90 days.

---

## Decision

We will use **Google Cloud Platform (GCP)** as our primary cloud provider.

### Services Selected

| Need | GCP Service |
|---|---|
| Backend (NestJS) | Cloud Run |
| MCP Servers | Cloud Run (one service per MCP server) |
| Frontend (Angular) | Firebase Hosting |
| Container Registry | Artifact Registry |
| Database | MongoDB Atlas (GCP region: `us-central1`) |
| Secrets / Env Vars | Secret Manager |
| CI/CD | Cloud Build + GitHub trigger |
| Logs & Monitoring | Cloud Logging + Cloud Monitoring |

### Architecture Overview

```
GitHub (main branch)
      │
      │  push trigger
      ▼
Cloud Build
      ├── build & push → Artifact Registry
      │
      ├── deploy backend  → Cloud Run (NestJS)
      └── deploy mcp-*    → Cloud Run (MCP servers)

Firebase Hosting ← Angular build (static)

Cloud Run (NestJS)
      │
      ├── Secret Manager  (env vars + API keys)
      ├── MongoDB Atlas   (us-central1, GCP peering)
      └── Cloud Run (MCP) (internal service-to-service)
```

### Why Cloud Run for Backend and MCP Servers

- **Serverless containers:** Deploy any Docker image without managing VMs or Kubernetes clusters.
- **Scale to zero:** No traffic = no cost. Critical for a project in early development.
- **Per-request billing:** Cost-efficient during low-traffic phases.
- **Native service-to-service auth:** Cloud Run services can call each other securely using IAM without exposing public endpoints.
- **MCP server isolation:** Each MCP server runs as an independent Cloud Run service, matching the isolation principle defined in ADR-002.

### Why Firebase Hosting for Frontend

- **Free tier is generous:** 10 GB storage, 360 MB/day transfer on the free plan.
- **Global CDN included:** No additional configuration needed.
- **Angular deploy in one command:** `firebase deploy --only hosting` via Angular Fire or Firebase CLI.
- **Same GCP project:** Firebase is part of GCP — same billing account, same IAM, no extra account management.

---

## Environment Strategy

Each app has its own `.env.example`. In production, all secrets are stored in **GCP Secret Manager** and injected into Cloud Run at deploy time via the `--set-secrets` flag. No secrets ever live in environment files committed to the repository or in container images.

```
# Example Cloud Run deploy with secrets
gcloud run deploy backend \
  --image us-central1-docker.pkg.dev/PROJECT_ID/repo/backend:latest \
  --set-secrets="MONGODB_URI=mongodb-uri:latest,JWT_SECRET=jwt-secret:latest" \
  --region us-central1
```

---

## Consequences

### Positive
- **$300 USD free credits** on a new GCP account — sufficient to cover development and early production phases.
- **Scale to zero** on Cloud Run means near-zero cost while the app is in development.
- **Cert alignment:** Deploying on GCP gives León direct hands-on experience relevant to the GCP Associate Cloud Engineer exam.
- **Managed secrets:** Secret Manager eliminates the risk of accidentally committing sensitive values.
- **MongoDB Atlas + GCP peering** in the same region (`us-central1`) minimizes latency between the backend and database.
- **One ecosystem:** Cloud Run + Firebase + Artifact Registry + Cloud Build all live in the same GCP project — unified billing, IAM, and logging.

### Negative / Trade-offs
- **GCP learning curve:** Cloud Run, Cloud Build, and Secret Manager require initial setup time. Offset by the cert study goal.
- **Firebase Hosting for Angular:** Firebase adds a dependency for a task that could also be handled by Cloud Storage + CDN. Chosen for simplicity; can be migrated later.
- **MongoDB Atlas is not a GCP-native service:** Atlas runs on GCP infrastructure but is managed by MongoDB, Inc. This is acceptable — a GCP-native alternative (Firestore) was considered but rejected due to the GraphQL + Mongoose architecture already defined in ADR-001.

### Neutral
- The AWS account with remaining credits is not being used for this project. It can be preserved for future experimentation or a different project.
- If the team or client requires AWS in the future, the containerized architecture (Docker + Cloud Run) makes migration straightforward — swap the registry and deploy target, keep the application code unchanged.

---

## Alternatives Considered

| Option | Reason Rejected |
|---|---|
| AWS (ECS / App Runner) | Free tier expired; less relevant to current cert goal; higher complexity for same outcome |
| Railway / Render | Good for prototypes but limited control over networking, IAM, and secrets — not production-grade for this project |
| Fly.io | Interesting but smaller ecosystem, less documentation, not aligned with cert goals |
| Self-hosted VPS (DigitalOcean, Hetzner) | Full control but requires manual infra management — too much overhead for two developers |
| Firestore instead of MongoDB | Would require abandoning Mongoose + the GraphQL code-first schema already defined in ADR-001 |

---

## References

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [GCP Secret Manager](https://cloud.google.com/secret-manager/docs)
- [MongoDB Atlas on GCP](https://www.mongodb.com/cloud/atlas/gcp)
- [Artifact Registry](https://cloud.google.com/artifact-registry/docs)
- [GCP Associate Cloud Engineer Exam Guide](https://cloud.google.com/learn/certification/cloud-engineer)
