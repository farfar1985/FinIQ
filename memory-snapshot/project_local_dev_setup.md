---
name: amira-mars local-dev boot recipe + onboarding sequence
description: 2026-05-15 midday. Captured the full local-dev recipe Cesar onboarded Farzaneh to via WhatsApp 1:14 PM ("Could you pull the latest from the repo and make it work in your local? ... `make dev` and the entire system should be ready at port 8000 for backend and 3000 for UI"). Includes prerequisites, Makefile commands, port map, .env requirements, common Windows issues (npm workaround, Docker Desktop must be running), Auth0 secrets we need from Cesar. Re-read this before re-attempting local-dev so we skip the discovery phase.
type: project
originSessionId: b3253814-675e-4c79-a58c-3184f8915019
---
## When to use this memory

Re-read before any `make dev` / local-dev session — captures the recipe so we go straight to execution.

## Prerequisites (one-time install, Windows)

| Tool | Version verified 2026-05-15 | Notes |
|------|------------------------------|-------|
| Docker Desktop | ≥ 4.30 | **MUST be running** before `make dev` (boots Postgres + MinIO + Temporal + secret-shim containers) |
| Python | 3.14.2 (works) | Cesar locked 3.13 in CLAUDE.md; uv manages the right version per pyproject |
| `uv` | 0.9.26 | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Node | 22.22 LTS | works |
| `npm` (system) | **BROKEN** | `C:\Program Files\nodejs\npm.cmd` errors with "Cannot find module npm-prefix.js" |
| `npm` (workaround) | 10.9.2 ✓ | Invoke via `node ~/.npm-install/package/bin/npm-cli.js <subcmd>` |
| Temporal CLI | optional | Available inside the container via `make temporal-cli` |
| `gh` CLI | ≥ 2.86 | Already authenticated as `farfar1985` (per feedback memory) |

## Port map (defaults from `make help`)

| Service | Host port | Container side | Override env var |
|---------|-----------|----------------|------------------|
| Postgres | 5432 | 5432 | `AMIRA_DEV_POSTGRES_PORT` |
| MinIO S3 | 9000 | 9000 | `AMIRA_DEV_MINIO_PORT` |
| MinIO UI | 9001 | 9001 | `AMIRA_DEV_MINIO_CONSOLE_PORT` |
| secret-shim | 8765 | 8765 | `AMIRA_DEV_SECRET_SHIM_PORT` |
| Temporal gRPC | 7233 | 7233 | `AMIRA_DEV_TEMPORAL_PORT` |
| Temporal UI | 8233 | 8233 | `AMIRA_DEV_TEMPORAL_UI_PORT` |
| FastAPI backend | 8000 | (host process, not container) | — |
| Next.js frontend | 3000 | (host process, not container) | — |

Override at the shell level if you have port conflicts. Container-side ports never change.

## Dev credentials (committed defaults — safe to know)

- Postgres: user `amira_dev` / pwd `amira_dev_pwd` / db `amira_dev` (also app role `amira_app` / `amira_app_pwd`)
- MinIO: access key `amira_dev` / secret `amira_dev_pwd`
- secret-shim: no auth (HTTP API on :8765)
- Temporal: no auth in dev (backed by shared Postgres)

## Boot sequence (canonical)

```bash
# 0. Verify Docker Desktop is running (whale icon green in tray)
docker version

# 1. Boot containers + run migrations atomically (PR #290 chained these)
make dev
# Equivalent to: dev-containers (docker compose up -d --build) + migrate (alembic upgrade head)
# Wait for "✓ dev stack ready (containers + schema at head)"

# 2. Set up apps/api/.env (see "Env file setup" below)

# 3. Seed default Org + 5 workspaces fixture
make seed-db
# Reads AMIRA_AUTH0_DEFAULT_ORG_ID + AMIRA_DB_DSN from apps/api/.env

# 4. Start backend (separate terminal — uvicorn doesn't background)
make backend
# FastAPI on http://localhost:8000
# Verify: curl http://localhost:8000/readyz

# 5. Start frontend (separate terminal)
# npm install only needs to run once
node ~/.npm-install/package/bin/npm-cli.js install
# Then run dev mode:
AMIRA_API_BASE_URL=http://localhost:8000 node ~/.npm-install/package/bin/npm-cli.js run dev
# Next.js on http://localhost:3000
```

`make dev-init` is the all-in-one shortcut: `make dev-containers + migrate + seed-db` — use this on a fresh checkout / post-`make reset`.

## Env file setup (`apps/api/.env`)

Cesar ships `apps/api/.env.example` as the template (landed 2026-05-14 in T-M1-22). 7 required keys:

| Key | Where to get it | Locally generate? |
|-----|-----------------|-------------------|
| `AMIRA_DB_DSN` | Copy from example (matches `make dev` substrate) | ✓ Default works |
| `AMIRA_AUTH0_DOMAIN` | `qdt-amira.us.auth0.com` (from runbook) | ✓ Default works |
| `AMIRA_AUTH0_CLIENT_ID` | `apD8TivBhuvmvSju522C1T75inKbOjKz` (from runbook) | ✓ Default works |
| `AMIRA_AUTH0_CLIENT_SECRET` | **Azure Key Vault `amira-platform/auth0-platform-client-secret`** | ❌ **Must ping Cesar** |
| `AMIRA_AUTH0_CALLBACK_URL` | `http://localhost:8000/auth/callback` | ✓ Default works |
| `AMIRA_AUTH0_DEFAULT_ORG_ID` | `org_l4AEkJYBn2PTiPPI` (from runbook) | ✓ Default works |
| `AMIRA_SESSION_COOKIE_SECRET` | Generate locally | ✓ `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `AMIRA_SESSION_REFRESH_TOKEN_KEY_B64` | Generate locally | ✓ `python -c "import base64, os; print(base64.b64encode(os.urandom(32)).decode())"` |

**Important**: `Settings()` fails loud at boot if any required key is missing — so until we have `AMIRA_AUTH0_CLIENT_SECRET`, `make backend` won't start. Containers + migrations work without it.

Also: for **local HTTP dev** (port 8000), flip `AMIRA_SESSION_COOKIE_SECURE=false` so the browser doesn't drop the Secure cookie on plain-HTTP origins. (Default true is for production HTTPS.)

## Auth0 onboarding (Cesar must do for Farzaneh)

Per Cesar's WhatsApp 1:15 PM: *"I may need to add you to the auth0 service for your own account"*

Two things he needs to do tenant-side at `qdt-amira.us.auth0.com`:
1. Add `farzaneh@qdt.ai` as a User
2. Add that user to the default Auth0 Organization (`org_l4AEkJYBn2PTiPPI`)

Without both, sign-in will fail with:
- `auth.unknown-org` (org claim missing/wrong) — 403
- `auth.email-collision` (email bound to different IdP sub) — 409

He's already aware. We just ping him when we hit it.

## Common Windows issues + recipes

### Docker Desktop not running
**Symptom**: `make dev` fails with `error during connect: ... open //./pipe/dockerDesktopLinuxEngine`
**Fix**: Open Docker Desktop GUI, wait for whale icon to turn green ("Engine running") in system tray, retry.

### npm broken
**Symptom**: `npm` errors with `Cannot find module 'C:\Program Files\nodejs\node_modules\npm\bin\npm-prefix.js'`
**Fix**: Use the workaround npm at `~/.npm-install/package/bin/npm-cli.js`:
```bash
node ~/.npm-install/package/bin/npm-cli.js <subcmd>
# e.g., node ~/.npm-install/package/bin/npm-cli.js install
# e.g., node ~/.npm-install/package/bin/npm-cli.js run dev
```
Long-term fix: `npm install -g npm@latest` may repair it — but the workaround works fine.

### Port already allocated
**Symptom**: `make dev` fails with `port already allocated`
**Fix**: `lsof -i :<port>` (or `netstat -ano | grep :<port>` on Windows Git Bash) to find the offender. Either stop the process or override the host port:
```bash
export AMIRA_DEV_POSTGRES_PORT=5435
make dev
```

### `psycopg async refuses Windows ProactorEventLoop`
**Symptom**: `alembic upgrade head` or `python -m amira_api._dev_fixtures.seed_default_org` fails with `sqlalchemy.exc.InterfaceError: (psycopg.InterfaceError) Psycopg cannot use the 'ProactorEventLoop' to run in async mode` (sqlalchemy error code `rvf5`).
**Cause**: Python 3.8+ on Windows defaults to `ProactorEventLoop`; psycopg async driver refuses it. Any script that calls `asyncio.run(...)` directly (alembic env.py, dev-fixture seed) hits this.
**Fix**: Add the same shim already in `tests/test_tenancy_models.py` and `tests/identity/conftest.py`:
```python
import asyncio, sys
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
```

**As of 2026-05-15, two files MISS this shim** — patched LOCALLY (not committed):
- `apps/api/migrations/env.py`
- `apps/api/src/amira_api/_dev_fixtures/seed_default_org.py`

**Status**: Real pre-existing bug. Flagged to Cesar via WhatsApp option 5/15. Cesar's call whether to take a 6-line PR or absorb into his own foundation cleanup. If Cesar says yes, the PR would target `master` directly — same-shape as the test-file shims.

**Backend `uvicorn` is NOT affected** — uvicorn manages its own event loop selection via uvloop / asyncio policy override at startup. Only script-style `asyncio.run(...)` entry points fail.

### Tests TRUNCATE the dev DB
**Symptom**: After running `pytest tests/identity/`, opening the dev server shows "unknown org" 403 on sign-in.
**Cause**: Test fixtures TRUNCATE `app.org / workspace / user / user_session / outbox_event / org_membership / workspace_membership` between tests, then seed with `org_testharness`. Dev-server state for those tables is gone.
**Fix**: `make seed-db` to reseed the demo Org. Long-term: separate `amira_dev_test` DB (not in v1 scope).

## Makefile command reference

| Command | What it does |
|---------|--------------|
| `make help` | Prints all commands + active ports |
| `make dev` | Containers + alembic upgrade head (canonical "make my dev env ready") |
| `make dev-containers` | Containers only (skip migrations — for schema-rollback debugging) |
| `make dev-init` | `make dev` + `make seed-db` (full bootstrap) |
| `make seed-db` | Insert default Org + 5 workspaces (idempotent) |
| `make stop` (`make dev-down`) | Stop containers, keep volumes |
| `make reset` (`make nuke`) | Stop + DELETE volumes (fresh DB next boot) |
| `make logs` | Tail container logs |
| `make psql` | Open psql against dev DB |
| `make migrate` | `alembic upgrade head` against dev DB |
| `make temporal-cli` | `temporal operator namespace list` inside container |
| `make backend` | FastAPI on `http://localhost:8000` |
| `make mock-frontend` | `npm run dev` (Next.js on :3000) — **broken on Windows, use workaround npm directly** |
| `make reload-secrets` | POST `/admin/reload` to secret-shim |
| `make infra-bootstrap` | Cluster bootstrap (against kubeconfig wired to AKS) |
| `make cluster-smoke` | Cluster smoke test standalone |

## Verification steps after first boot

```bash
# Postgres has pgvector + extensions
make psql -c "SELECT extname FROM pg_extension WHERE extname IN ('vector', 'pgcrypto', 'pg_trgm');"
# Expected: 3 rows

# MinIO buckets exist
curl -s http://localhost:9001  # MinIO console — log in with amira_dev/amira_dev_pwd

# secret-shim reachable
curl -s http://localhost:8765/api/v1/namespaces/amira-dev/secrets/amira-platform-api

# Temporal alive
docker exec amira-dev-temporal temporal operator namespace list --address temporal:7233
# Expected: "default" namespace listed

# Backend health
curl http://localhost:8000/readyz
# Expected: 200 OK

# Frontend reachable
# Open http://localhost:3000 in browser — should see landing page
```

## What's NOT in local dev (per LOCAL_DEV.md "What's NOT in this setup yet")

- **Auth0 / OIDC sign-in landed with T-M1-22** (works locally with real Auth0 tenant + redirect URI `http://localhost:8000/auth/callback`)
- **Audit consumer + outbox drain landed with T-M1-56** (no longer "not in this setup")
- **Compliance / Skills / Build sandbox** — M3 scope
- **Caddy reverse-proxy** mirroring nginx-ingress hostnames — deferred at T-M1-18, reintroduce when needed
- **Elastic Agent / Fleet log forwarding in compose** — deferred at T-M1-18
- **Connection pooler in front of Postgres** — deferred per SIMPLIFY-PERSIST-2

## Recipe summary (for fast resume)

1. Start Docker Desktop, wait for green whale
2. `cd D:/amira-mars && git pull --ff-only origin master`
3. Verify pre-flight: `docker version`, `python --version`, `uv --version`, `node --version`
4. `make dev` — containers + migrations (~2-3 min first time, pulls images)
5. Copy `apps/api/.env.example` → `apps/api/.env`, fill in 2 generated secrets + paste Cesar's Auth0 client secret + flip `AMIRA_SESSION_COOKIE_SECURE=false` for local HTTP
6. `make seed-db` — seed default Org
7. `make backend` (terminal 1) — backend on :8000, verify with `curl http://localhost:8000/readyz`
8. `node ~/.npm-install/package/bin/npm-cli.js install` (one-time)
9. `AMIRA_API_BASE_URL=http://localhost:8000 node ~/.npm-install/package/bin/npm-cli.js run dev` (terminal 2) — frontend on :3000
10. Open `http://localhost:3000` — landing page → click Sign in → if 403 ping Cesar to add Farzaneh to Auth0
