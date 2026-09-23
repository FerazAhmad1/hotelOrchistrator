# Hotel Offer Orchestrator

A Node.js/TypeScript service that aggregates hotel offers from two mock suppliers, deduplicates them by hotel name (keeping the cheaper price), and lets clients filter the result by price range — with the comparison logic orchestrated by [Temporal.io](https://temporal.io) and the deduplicated data cached and filtered inside Redis.

## Architecture & Request Flow

```
Client
  │  GET /api/hotels?city=delhi&minPrice=&maxPrice=
  ▼
Express API (controllers/hotel.ts)
  │
  ├─ Redis cache check (hotels:<city>:data)
  │
  ├─ (cache miss) Temporal Client ──► hotelWorkflow(city)
  │                                       │
  │                                       ├─► fetchSupplierA(city) ─┐  (parallel activities,
  │                                       └─► fetchSupplierB(city) ─┘   run by the Worker)
  │                                       │
  │                                       ▼
  │                              dedupe by name, cheaper price wins
  │                                       │
  │                              save to Redis (Hash + Sorted Set)
  │
  └─ Redis ZRANGE ... BYSCORE (price-range filter, server-side)
           │
           ▼
       JSON response
```

The Express process and the Temporal Worker are separate containers/processes; the Worker hosts the workflow and activity code and talks to the Temporal server, while Express only talks to the Temporal Client to start/await a workflow execution.

## Tech Stack

- **Node.js / TypeScript** — application runtime and language
- **Express** — HTTP API layer
- **Temporal.io** (`@temporalio/client`, `@temporalio/worker`, `@temporalio/workflow`) — orchestrates the parallel supplier calls and dedupe logic
- **Redis** (`ioredis`) — stores the deduplicated hotel list and performs price-range filtering server-side
- **Docker Compose** — runs the full stack (API, Worker, Temporal server, Redis) as one command

## Features

- Calls two mock supplier APIs in parallel via a Temporal workflow
- Deduplicates hotels by name, keeping the cheaper of the two supplier offers
- Keeps a hotel as-is when only one supplier returns it
- Filters the deduplicated list by `minPrice`/`maxPrice`, computed inside Redis (not in application code)
- Input validation with clear error messages
- Fully Dockerized: one `docker compose up` brings up the API, Worker, Temporal dev server, and Redis

## Prerequisites

- Docker Desktop (or another Docker Engine with Compose v2) installed and **running**

Nothing else is required locally — dependencies are installed and the app is built inside the Docker image, not on the host.

## Getting Started (Docker)

From the repository root:

```bash
docker compose up --build
```

This starts four services:

| Service    | Purpose                                                          | Port(s)              |
|------------|-------------------------------------------------------------------|-----------------------|
| `redis`    | Stores the deduplicated hotel data and price index                | `6379`                |
| `temporal` | Temporal dev server (workflow orchestration engine + Web UI)       | `7233` (gRPC), `8233` (UI) |
| `app`      | Express API server (`npm start`)                                   | `8000`                |
| `worker`   | Temporal Worker running the workflow/activities (`npm run worker`) | — (internal only)     |

Once it's up:
- API: `http://localhost:8000`
- Temporal Web UI: `http://localhost:8233`

Confirm it's healthy by checking the logs:
```bash
docker compose logs app     # expect: "server running on 8000 port" and "Redis connected"
docker compose logs worker  # expect: Worker state changed ... state: 'RUNNING', taskQueue: 'hotel-task-queue'
```

## API Endpoints

| Method | Path                | Query params                          | Description                                                        |
|--------|----------------------|-----------------------------------------|----------------------------------------------------------------------|
| GET    | `/api/hotels`         | `city` (required), `minPrice`, `maxPrice` (both optional) | Deduplicated, best-priced hotel list for a city, optionally price-filtered |
| GET    | `/supplierA/hotels`   | `city` (required)                       | Raw mock data from Supplier A                                       |
| GET    | `/supplierB/hotels`   | `city` (required)                       | Raw mock data from Supplier B                                       |

The mock suppliers only have data for `city=delhi` (case-insensitive); any other city returns an empty list.

## Example Response

`GET /api/hotels?city=delhi`:

```json
{
  "success": true,
  "data": [
    {
      "hotelId": "b1",
      "name": "Holtin",
      "price": 5340,
      "city": "delhi",
      "commissionPct": 20,
      "supplier": "Supplier B"
    },
    {
      "hotelId": "a2",
      "name": "Radison",
      "price": 5900,
      "city": "delhi",
      "commissionPct": 13,
      "supplier": "Supplier A"
    },
    {
      "hotelId": "b3",
      "name": "Leela",
      "price": 6800,
      "city": "delhi",
      "commissionPct": 18,
      "supplier": "Supplier B"
    },
    {
      "hotelId": "a3",
      "name": "Taj",
      "price": 7500,
      "city": "delhi",
      "commissionPct": 12,
      "supplier": "Supplier A"
    }
  ]
}
```

## Deduplication Logic

Implemented in [`src/workflows/hotel.workflow.ts`](src/workflows/hotel.workflow.ts). After both suppliers respond, hotels are merged into a `Map` keyed by name; for each hotel, if it's not yet in the map or its price is cheaper than the one already stored, it replaces the entry. A hotel returned by only one supplier is kept as-is once, since it never competes with another entry.

For `city=delhi`, both suppliers list **Holtin** and **Radison**:
- **Holtin**: Supplier A ₹6000 vs Supplier B ₹5340 → Supplier B wins
- **Radison**: Supplier A ₹5900 vs Supplier B ₹6200 → Supplier A wins
- **Leela** (Supplier B only) and **Taj** (Supplier A only) are kept as-is

## Redis Data Structures & Price Filtering

Implemented in [`src/services/hotel-redis.service.ts`](src/services/hotel-redis.service.ts). For each city, two keys are written after the workflow completes:

- `hotels:<city>:data` — a **Hash**, `hotel name → JSON.stringify(hotel)`, the full deduplicated hotel objects
- `hotels:<city>:price` — a **Sorted Set**, `member = hotel name`, `score = price`

Price filtering is done with `ZRANGE hotels:<city>:price <min> <max> BYSCORE`, which asks Redis to return only the members whose score (price) falls within the requested range — the range computation happens inside Redis itself, not by filtering an array in application code. `minPrice`/`maxPrice` default to `-inf`/`+inf` when omitted. The matching hotel names are then used to `HMGET` the full objects from the data hash.

There is currently no TTL or cache invalidation on these keys — a city's cached snapshot persists until explicitly cleared (see [Testing](#testing) below). Real-time invalidation is planned via a supplier webhook (see [Future Improvements](#future-improvements)).

## Temporal Architecture

- **Workflow**: `hotelWorkflow(city)` ([`src/workflows/hotel.workflow.ts`](src/workflows/hotel.workflow.ts)) — orchestrates the comparison; contains no I/O itself, only calls activities and merges results.
- **Activities**: `fetchSupplierA`, `fetchSupplierB` ([`src/activities/hotel.activities.ts`](src/activities/hotel.activities.ts)) — each activity calls one supplier's mock service; proxied with a `10 second` `startToCloseTimeout`.
- **Parallel execution**: the workflow calls both activities with `Promise.all`, so Supplier A and Supplier B are queried concurrently rather than sequentially.
- **Worker**: [`src/temporal/worker.ts`](src/temporal/worker.ts) hosts the workflow and activity code and polls task queue `hotel-task-queue` (Temporal's default namespace).
- **Client**: [`src/temporal/client.ts`](src/temporal/client.ts) is used by the Express controller to start a workflow execution and await its result.
- **Current failure behavior**: since the two activities are called with `Promise.all`, if either supplier activity throws, the whole workflow fails (Temporal's activity retry policy still applies to each individual activity first). There is no per-supplier fallback today — see [Future Improvements](#future-improvements).

## Validation Behavior

| Condition                              | Response                                                              |
|------------------------------------------|--------------------------------------------------------------------------|
| `city` missing                          | `400 { "success": false, "message": "city is required" }`               |
| `minPrice`/`maxPrice` not a valid number | `400 { "success": false, "message": "minPrice and maxPrice must be valid numbers" }` |
| `minPrice` greater than `maxPrice`       | `400 { "success": false, "message": "minPrice cannot be greater than maxPrice" }` |

## Docker Setup

- **`Dockerfile`** (root) — builds a single image used by both `app` and `worker`: `FROM node:24` (not Alpine — Temporal's native `@temporalio/core-bridge` binary is glibc-linked and fails to load under Alpine's musl libc), `npm ci` for reproducible installs, copies the source, runs `npm run build` (compiles `src/` → `dist/` via `tsc`), exposes port `8000`, defaults to `CMD ["npm", "start"]`.
- **`docker-compose.yml`** (root) — four services:
  - `redis` (`redis:7-alpine`) with a `redis-cli ping` healthcheck
  - `temporal` (`temporalio/temporal:latest`, running `server start-dev`) with a `temporal operator cluster health` healthcheck
  - `app` — builds from the root `Dockerfile`, runs `npm start`, publishes `8000`, waits for `redis`/`temporal` to be healthy
  - `worker` — builds from the same `Dockerfile`, runs `npm run worker`, waits for `temporal` to be healthy
  - `app`/`worker` reach Redis/Temporal via the Docker network hostnames `redis:6379`/`temporal:7233`, set directly as `environment:` values in the compose file — independent of any local `.env`/`src/.env`.
- **`.dockerignore`** — excludes `node_modules`, `dist`, `.git`, `src/.env`, `.env`, `*.log`, `.DS_Store` from the build context.

## Project Structure

```
.
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── package.json
├── tsconfig.json
├── postman/
│   └── Hotel-Offer-Orchestrator.postman_collection.json
└── src/
    ├── app.ts                          # Express app + route mounting
    ├── server.ts                       # HTTP server entrypoint
    ├── redis.ts                        # ioredis client
    ├── config/env.ts                   # env var loading (PORT, REDIS_URL, TEMPORAL_ADDRESS)
    ├── controllers/
    │   ├── hotel.ts                     # GET /api/hotels — cache check, workflow trigger, price filter
    │   ├── supplier-a.ts                # GET /supplierA/hotels
    │   └── suplier-b.ts                 # GET /supplierB/hotels
    ├── routes/
    │   ├── hotel.ts
    │   ├── suplier-a.ts
    │   └── suplier-b.ts
    ├── services/
    │   ├── hotel-aggregation.service.ts # standalone dedupe helper (not currently called by the workflow)
    │   └── hotel-redis.service.ts       # Redis save/read + BYSCORE price filtering
    ├── suppliers/
    │   ├── hotel-supplier.interface.ts
    │   ├── supplier-a.service.ts        # mock Supplier A data (delhi only)
    │   └── supplier-b.service.ts        # mock Supplier B data (delhi only)
    ├── temporal/
    │   ├── client.ts                    # Temporal Client (used by the API)
    │   └── worker.ts                    # Temporal Worker entrypoint
    ├── types/hotel.ts                   # Hotel type
    ├── workflows/hotel.workflow.ts      # hotelWorkflow — parallel fetch + dedupe
    └── activities/hotel.activities.ts   # fetchSupplierA / fetchSupplierB
```

## Testing

A Postman collection is provided at [`postman/Hotel-Offer-Orchestrator.postman_collection.json`](postman/Hotel-Offer-Orchestrator.postman_collection.json) — import it into Postman, set the `baseUrl` collection variable (defaults to `http://localhost:8000`), and run the requests with the stack up.

It covers: a valid city with supplier overlap, price-range filtering, a city with no results, and the three validation error cases, plus the two raw supplier endpoints.

**Tip**: since Redis caching has no TTL, if you change the mock supplier data and want to see fresh results for a city you've already queried, clear the cache first:
```bash
docker compose exec redis redis-cli flushall
```

## Future Improvements

- `/health` endpoint reporting the reachability of both mock suppliers (listed as a bonus in the original spec; not implemented yet)
- Cache invalidation driven by a supplier webhook instead of being unbounded
- Per-supplier graceful degradation in the workflow (currently a single supplier failure fails the whole request)
- Replace hardcoded mock supplier data with configurable/randomized fixtures or real supplier integrations
