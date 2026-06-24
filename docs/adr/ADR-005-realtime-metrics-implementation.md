# ADR-005: Real-Time Metrics Collection and Streaming

## Status
Accepted

## Context
The application needs to display live system metrics (CPU, RAM, disk, network) from the host machine to the Angular frontend. The frontend must receive updates without polling (as mandated by ARCHITECTURE.md). Additionally, historical snapshots must be stored for future chart visualizations.

## Decision
We implement a real-time metrics pipeline with the following characteristics:

1. **Collection**: The `MetricsService` uses the `systeminformation` Node.js library to query system stats every **2 seconds**. This frequency balances real-time feel with CPU overhead.

2. **Storage**: Each snapshot is saved as a document in MongoDB using Mongoose. A **TTL index** on `timestamp` automatically deletes documents older than 7 days (604,800 seconds) to bound storage growth.

3. **Streaming**: The service publishes each snapshot via NestJS's in-memory `PubSub` engine. The `MetricsResolver` exposes a `@Subscription()` that streams these events to clients over `graphql-ws`.

4. **API Layer**: GraphQL is the sole API. We use code-first `ObjectType` DTOs (e.g., `MetricSnapshotModel`) to decouple the database schema from the public GraphQL schema.

5. **Frontend Integration**: The Angular app uses Apollo Client with a split link: HTTP for queries/mutations, and WebSocket for subscriptions. The `DashboardComponent` subscribes on init and updates the UI reactively.

## Consequences
### Positive
- Zero polling: bandwidth and server load are minimized.
- Historical data is available from day one, enabling future chart features.
- TTL index ensures the database doesn't grow indefinitely.
- The separation between Mongoose schemas and GraphQL DTOs allows future database migrations without breaking the API.

### Negative / Risks
- **PubSub is in-memory**: If the backend scales to multiple instances (Cloud Run running more than 1 container), subscribers attached to instance A will not receive metrics published by instance B. This is acceptable for Phase 1 because:
  - We plan to run with `concurrency=1` or a single instance.
  - Cloud Run can be configured to scale to 1 minimum instance.
- **No backpressure or buffering**: If a client disconnects, the backend still stores snapshots in MongoDB. The client can catch up by querying historical data, but it will miss the real-time events that occurred while disconnected.

### Future Considerations
- **Redis**: If we scale to multiple backend instances, we will replace `PubSub` with a Redis Pub/Sub mechanism. This will require a new ADR and a configuration flag.
- **Graphs**: Visualizing historical data will be added in a later ADR (likely using Chart.js or ECharts).
- **External Servers (Phase 2)**: This decision does not cover multi-server monitoring; that will be handled by a separate ADR.

## Compliance
- ✅ No REST endpoints.
- ✅ No polling from frontend.
- ✅ Types shared via `/shared` package.
- ✅ TTL index implemented from day one.