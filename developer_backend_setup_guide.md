# Institutional Backend Architecture & Deployment Guide
**Blockchain Operating System (BOS) Engine**
**Version**: 3.0.0 (Institutional Watchtower Release)

---

## 1. Complete Backend File Map

The following map represents the strict institutional structure of the BOS backend.

```text
backend/
├── main.py                    # Gateway Entry Node (FastAPI Initializer)
├── requirements.txt           # Dependency Manifest
├── Procfile                   # Process Manager Configuration
├── .env                       # Secrets & Handshake Registry
├── app/
│   ├── main.py                # Main Application Logic
│   ├── db.py                  # Supabase Database Connector
│   ├── config.py              # Environment Registry Mapping
│   ├── models.py              # Request/Response Schema (Pydantic)
│   ├── routes/
│   │   ├── ws.py              # Real-time WebSocket Gateway
│   │   ├── webhook.py         # External Payment Webhooks (FLW)
│   │   ├── activities.py      # Normalized Activity History API
│   │   ├── accounts.py        # Institutional Account Registry
│   │   ├── withdraw.py        # Banking Withdrawal Node
│   ├── services/
│   │   ├── connection_manager.py # WS Lifecycle & Event Dispatcher
│   │   ├── event_engine.py      # Normalized Event Payload Generator
│   │   ├── security_engine.py   # Heuristic Risk Detection Node
│   │   ├── notification_persistence.py # Durable DB Storage Service
│   │   ├── notification_engine.py # Event logic & Alerting
│   │   ├── flutterwave.py       # Fiat Rails Service
│   │   ├── wallet.py           # Address Indexing Utility
│   ├── mempool/
│   │   ├── models.py           # LiveTransaction Lifecycle Models
│   │   ├── tx_cache.py         # In-memory Deduplication Registry
│   │   ├── tx_state_machine.py # Transaction State Transition Logic
│   │   ├── confirmation_tracker.py # Block Depth & Depth Tracking
│   │   ├── watchers/
│   │   │   ├── base_watcher.py # Abstract Watcher Interface
│   │   │   ├── evm_watcher.py  # Alchemy/QuickNode WSS Mempool Monitor
```

---

## 2. Full Architectural Walkthrough

### Core Gateway (`main.py` / `ws.py`)
*   **main.py**: The central orchestration node. It initializes FastAPI, applies institutional CORS guards, and registers all service routers.
*   **ws.py**: The WebSocket endpoint (`/ws/{wallet_address}`). It authenticates the connection and performs the "Initial Handshake" where it maps the socket to a specific wallet address.

### Real-time Engine (`connection_manager.py` / `event_engine.py`)
*   **connection_manager.py**: Manages the active connection registry. It handles heartbeats (PING/PONG), message buffering for unstable networks, and multicasts events to the correct wallet-mapped sockets.
*   **event_engine.py**: The normalization node. It takes raw blockchain data and converts it into the "Canonical Event Schema" (eventId, type, payload, title, message) used by the frontend.

### Intelligence & Security (`security_engine.py` / `mempool/`)
*   **security_engine.py**: A local heuristic analyzer that scans raw transaction `input` data for signatures of "Unlimited Approvals" or "NFT Draining" before a transaction is confirmed.
*   **evm_watcher.py**: A long-lived background process that maintains a WSS connection to node providers (Alchemy/QuickNode), listening to `newPendingTransactions` in the global mempool.
*   **tx_state_machine.py**: Tracks a single `tx_hash` from its first appearance in the mempool through block inclusion and final confirmation depth.

### Persistence Layer (`notification_persistence.py` / `activities.py`)
*   **notification_persistence.py**: Selectively writes critical events (Security Alerts, Confirmed Swaps) to the Supabase `notifications` table for long-term history.
*   **activities.py**: Provides the REST API for the frontend to hydrate the historical Activity Center timeline.

---

## 3. Backend Boot Lifecycle

1.  **Initialization**: FastAPI starts and loads `.env` variables into `config.py`.
2.  **Service Registry**: The `ConnectionManager` and `EventEngine` instances are initialized in memory.
3.  **Database Handshake**: The Supabase client establishes a connection for persistence.
4.  **Watcher Ignition**: On startup, the `EVMWatcher` (and other chain watchers) spawn background tasks that connect to Alchemy/QuickNode WSS endpoints.
5.  **WebSocket Gateway**: The `/ws` route becomes available, ready to accept client handshakes.
6.  **Monitoring Pulse**: Watchers begin streaming raw mempool hashes; `SecurityEngine` begins heuristic scanning.

---

## 4. Exact Deployment Instructions

### Prerequisites
*   **Python**: 3.10 or higher.
*   **Node Providers**: Alchemy or QuickNode account with WSS enabled.
*   **Database**: Supabase project.

### Local Execution
```bash
# 1. Install Dependencies
pip install -r backend/requirements.txt

# 2. Configure Environment
cp .env.example .env # Ensure variables are set

# 3. Launch Engine
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Production Hosting Recommendation
*   **Platform**: DigitalOcean App Platform, Fly.io, or AWS ECS.
*   **CRITICAL**: Do **NOT** use Vercel for the backend. Vercel is serverless; the BOS engine requires **long-lived, stateful processes** for WebSocket connections and mempool watchers. Vercel functions will timeout and disconnect your watchers.
*   **Docker**: Use a `Dockerfile` to ensure a persistent runtime environment.

---

## 5. Environment Variables

| Variable | Required | Purpose |
| :--- | :--- | :--- |
| `SUPABASE_URL` | YES | Connection string for database persistence. |
| `SUPABASE_SERVICE_ROLE_KEY` | YES | Bypasses RLS for system-level event writes. |
| `ALCHEMY_WS_URL` | YES | WSS endpoint for real-time mempool monitoring. |
| `FLW_SECRET_KEY` | YES | Flutterwave API secret for fiat rail processing. |
| `FLW_WEBHOOK_HASH` | YES | Security secret for verifying incoming payments. |
| `REDIS_URL` | OPTIONAL | Required for horizontal scaling (Phase 4). |

---

## 6. Frontend ↔ Backend Realtime Flow

1.  **Handshake**: `useRealtimeGateway.ts` connects to `ws://backend:8000/ws/{wallet}`.
2.  **Detection**: `evm_watcher.py` detects a pending TX involving `{wallet}`.
3.  **Normalization**: `EventEngine` generates a `TX_PENDING` event payload.
4.  **Broadcast**: `ConnectionManager` finds the socket for `{wallet}` and sends the JSON.
5.  **Emission**: `useRealtimeGateway` receives the JSON and emits it via `systemEmitter.ts`.
6.  **UI Update**: `ActivityPanel` and `RealtimeToast` listen to `systemEmitter` and update the view instantly.

---

## 7. Blockchain Monitoring Security Model

**The backend operates on a "Zero-Trust Private Key" model.**

*   **Public Monitoring**: All monitoring is performed using **public wallet addresses** only.
*   **No Seeds**: The backend never requests, stores, or receives seed phrases or private keys.
*   **Read-Only**: The backend acts strictly as an observer (Watchtower) and broadcaster.
*   **Mempool Privacy**: We filter the global mempool stream on the server-side to identify transactions related to active user sessions.

---

## 8. Scaling & Redis Integration

Current implementation uses `InMemoryConnectionManager`. To scale to millions of users:

1.  **Redis Pub/Sub**: Replace in-memory maps with Redis. This allows multiple backend pods to share the same session state.
2.  **Worker Nodes**: Separate the `EVMWatcher` into independent worker nodes that publish events to Redis.
3.  **Gateway Nodes**: The FastAPI nodes become lightweight gateways that simply subscribe to Redis channels and push to WebSockets.

---

## 9. Current Limitations & Hardening

*   **In-memory TX Cache**: If the server restarts, pending transactions that haven't been persisted to DB may "flicker" until detected again.
*   **Rate Limits**: WSS connections to Alchemy have request-per-second limits. Production requires a dedicated Tier 2/3 plan.
*   **Scaling**: Currently optimized for single-instance vertical scaling. Horizontal scaling requires the Redis update mentioned above.
