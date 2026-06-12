# #756 — Agent-session cap: stop the leak + self-serve cleanup + cap/tenancy model

Design brainstorm for Cesar's lock. Same flow as #681 / #729: ground-truth study → options + tradeoffs → recommendation → **no build until the design is locked**.

Ticket: [#756](https://github.com/quantumdatatechnologies/amira-mars/issues/756). Companion UX stopgap already shipped separately as PR #759 (#755 modal).

---

## 1. The problem (Cesar's framing, verbatim crux)

> "The cap is currently per-org... is the 50 shared across all members of the team org...? Should it be per-user-within-org? Per-workspace? Is org even the right axis...? Who can run the cleanup, and at what scope...?"

Plus the two mechanical deliverables: stop the session-end leak, and give users a self-serve cleanup surface ("danger zone").

Live evidence of the leak: the dev DB held **23 "active" sessions** during the #755 verification — all completed or abandoned long ago, none ever ended.

---

## 2. Ground truth (what the code does today)

All file refs against master `7a2a03a`-era tree (readonly clone, pulled 2026-06-10).

### 2.1 The cap mechanism

- `agents/start_helpers.py::start_agent_session` is the single chokepoint: advisory-lock → count → 429 or emit `agent.session-started` → start workflow. Cap setting `AMIRA_AGENT_SESSION_PER_ORG_CAP` (default 50, `ge=1`); the settings docstring itself admits the default was raised 5→50 **because of the leak** and calls auto-end "a follow-up".
- `_count_active_sessions` (start_helpers.py:313–352): counts `agent.session-started` outbox rows with no matching `agent.session-ended`, correlated on the **JSONB** `payload->'context'->>'session_id'` — **no index** on that expression.
- The session-started row already carries everything needed for finer cap axes — **no migration required for any of them**:
  - `actor_user_id` — a real **column** on `outbox_event` (not payload), populated on every start.
  - `context.agent_class` (JSONB) — per-agent-class counts possible.
  - `project_id` — present; workspace is NOT recorded.

### 2.2 The leak — where sessions start and (don't) end

`agent.session-ended` has exactly **one emitter in the entire codebase**: the explicit cancel route (`agents/control.py:187–225`, creator-only, idempotent via `_session_already_ended`). The control route's own comments point at plan/05's "workflow exit Activity (T-M2-05, future)" as the designed-but-unbuilt slot.

Per-class terminal states (none emit session-ended):

| Agent class | Workflow terminal path | Terminal state column | Leaks? |
|---|---|---|---|
| Spec | approval_signed (locked) or conclude | `spec_version.state` → `approved` | ✅ one row per session |
| Build | conclude → spawns Deploy child (ABANDON) | `build_session.state` → `completed/failed/cancelled` | ✅ |
| Deploy | turn `kind="complete"` or circuit-breaker | `deploy_session.state` → `promoted/aborted` | ✅ |
| Skill-creator | publish → `_done` | (no session table) | ✅ |
| Companion-register | 5-stage synthesis completes | (child workflow of Deploy — **no session row at all**) | n/a |
| Companion (per-turn chat) | one workflow **per turn**, exits after the turn | (no session table) | **NO — see 2.3** |

`start_agent_session` callers (= the five doors the cap actually guards): generic start route (`agents/start.py`), spec genesis ×2 (`domain/spec/genesis.py` — home hero + /spec/new), e-sign → Build handoff (`domain/spec/routes_handoff.py`), repo import (`domain/spec/import_routes.py`).

### 2.3 NEW FINDING — companion turns bypass the cap entirely

`companion/api/routes.py:360` starts `CompanionAgentWorkflow` **directly** via `temporal.start_workflow` — the code comment explicitly notes it does not use the standard start path. Consequence: companion turns emit **no** `agent.session-started`, so they neither leak **nor count against any cap**. A chatty companion thread can spawn unbounded concurrent per-turn workflows with zero enforcement. (Initially mis-read by one study as an O(N)-per-turn leak — verified against the route source: it's the opposite, an enforcement gap.)

### 2.4 Tenancy entities (for the cap-axis question)

- **Org** — tenant root; `origin` column distinguishes **personal** (`self_signup`) from **team** (`operator_provisioned` / `user_created`). In a personal org, per-org ≡ per-user by construction.
- **Workspace** — a REAL table (org-scoped BU container + `workspace_membership`), not just UX. But session events don't record workspace, and the workspace switcher UI isn't built (#602) — a per-workspace cap needs new wiring on the start path.
- **Roles** — `org_membership.role_flags` text array: `member` / `org_admin` / `authorized_approver`. House pattern for admin gating is the role-flag check (`_require_org_admin`), as used by AUTHZ-1's capability grant/revoke routes (which also model the no-self-escalation guard + audit emit).
- Today only the **platform operator** can mass-revoke (and that's *user/browser* sessions). Tenant `org_admin` has no agent-session powers — the gap D2 fills.

### 2.5 Existing UI patterns + endpoint inventory (for D2/D3)

- **No agent-session list endpoint and no agent-session UI exist.** Cancel-by-id exists (creator-only). `GET /agents/sessions/{id}` snapshot exists.
- `/settings/security` lists **browser** sessions with per-row revoke — the exact UI shape to mirror for agent sessions.
- `/settings/team` Danger Zone (type-to-confirm delete-workspace) — the house destructive-action pattern.
- `/settings/usage` — tokens/cost only today; natural home for a capacity card.
- The #755 modal (PR #759) already shows live `active_count / cap` at rejection time.

---

## 3. D1 — Stop the leak

### Option A — workflow-exit emission (plan/05's designed slot) ✅ recommended

Each agent workflow emits `agent.session-ended` via a final Activity on its terminal path (Spec: approval_signed + conclude; Build: conclude; Deploy: complete + circuit-breaker; Skill-creator: publish), wrapped try/finally where the workflow already has one. One shared emit-helper Activity; idempotent (reuse the `_session_already_ended` existence-check, same as cancel); `ended_state` carries the per-class terminal (`approved` / `concluded` / `completed` / `promoted` / `aborted` / `published`).

- Pros: restores audit symmetry (every started has an ended); fills the slot plan/05 already reserved (T-M2-05); count query unchanged; no new runtime dependency on the start path.
- Cons: touches 4 workflows + shared helper; Activity-retry double-emit risk (mitigated by the existence check — same guard cancel uses today).

### Option B — Temporal `describe()` at cap-check time

Count started rows, then filter by live workflow status via gRPC.

- Pros: Temporal is authoritative; no workflow edits.
- Cons: gRPC fan-out per session-start request (latency + scale); adds a Temporal dependency to the start path; the audit trail stays asymmetric (rows still lie).

### Option C — idle-timeout sweeper

Periodic job ends sessions after N hours of inactivity.

- Pros: also catches crashed/stuck workflows that never reach a terminal path.
- Cons: wrong semantics alone (long legit sessions get killed); the settings docstring already frames idle-timeout as a *follow-up*, not the fix.

**Recommendation: A**, with C as an optional later backstop for crashed workflows (out of this PR unless you want it in). While touching the count query, add the **expression index** on `(kind, org_id, (payload->'context'->>'session_id'))` — the correlation is unindexed today.

**Backfill of the existing zombies:** the D2 danger-zone bulk-end doubles as the manual backfill (org_admin presses "End all"), so no migration-time data surgery needed. If you prefer automatic: a one-time script that ends started-rows whose workflow is no longer running.

---

## 4. D2 — Self-serve cleanup ("danger zone")

### Recommended shape

1. **`GET /agents/sessions`** (org-scoped list): active sessions with `session_id, agent_class, project, started_by (actor_user_id), started_at` — same correlation as the count query.
2. **Per-row "End session"** — reuses cancel semantics (Temporal cancel + session-ended emit, idempotent). Members may end **their own**; `org_admin` may end **any** in the org (audit row records the admin as actor, `action="admin-cleanup"` distinct from `"cancel"`).
3. **Danger zone: "End all active sessions"** (org_admin only, type-to-confirm, mirroring delete-workspace) — bulk variant of the same path; skips already-ended.

Rejected thinner variant: a blind "End all" button with no list — admin can't see what they're killing; the list is also the D3 indicator's natural home.

**Location options** (your pick): (a) `/settings/usage` — capacity story lives with usage ✅ slight rec; (b) `/settings/security` — "sessions" concept already there, but those are browser sessions (different audience); (c) new `/settings/agent-sessions` page.

**Permission model:** `org_admin` role flag via the existing `_require_org_admin` house pattern (same as AUTHZ-1 capability routes). A dedicated `sessions:manage` capability is possible but would be a new vocabulary for one action — role flag is the faithful mirror.

---

## 5. D3 — Proactive "X of N" indicator

- **Recommended:** a capacity header on the D2 card — "Using **X of N** active agent sessions" — one query, same payload the modal already uses. The #755 modal covers the at-rejection moment; this covers the before-rejection moment.
- Optional cheap add: a one-line warning under the new-session composers when ≥80% of cap ("Your org is near its session limit — X of N").
- Rejected for v1: always-visible top-bar badge (over-prominent for a rarely-binding limit).

---

## 6. D4 — THE CRUX: cap axis + cleanup scope

What the data supports **today, zero migrations**: per-org (exists), per-user-within-org (`actor_user_id` column), per-agent-class (`context.agent_class`). Per-workspace would need the start path to begin recording workspace (sessions don't carry it).

### Option A — keep per-org only
Simple; but in a team org one member can consume all 50 and starve teammates — the fairness question Cesar raised stays unanswered.

### Option B — per-org ceiling + per-user-within-org fairness sub-limit ✅ recommended
Two settings: `PER_ORG_CAP` (the infra/resource ceiling, stays 50) + `PER_USER_CAP` (fairness, e.g. default 10, must be ≤ org cap). Both checked at start under the same advisory lock; the typed 429 gains a `scope: "org" | "user"` field so the #755 modal can say *which* limit bit ("**You** are using 10 of 10…" vs "**Your organization** is using 50 of 50…").

- Personal orgs degenerate cleanly: one member, whichever limit is lower binds — no special-casing needed (or skip the user check when `org.origin = self_signup`, your call; my rec: no special case, just run both checks).
- Pros: answers the starvation problem; zero schema work; org stays the billing/infra axis (matches everything else in the platform — RLS, config, audit are all org-scoped).
- Cons: one more setting to explain; two counts per start (same query shape, one extra WHERE).

### Option C — per-workspace
Workspace is real, but: sessions don't record workspace; the workspace switcher (#602) isn't built; projects→workspace mapping on the session path doesn't exist. **Defer** — not wrong, just premature: org+user already answers fairness, and workspace wiring would be the only schema-touching part of #756.

**Per-agent-class caps:** available for free (payload has `agent_class`) — noted as a lever, **not** recommended for v1 (YAGNI; no observed need).

**Cleanup scope (the "who cleans" half of the crux):** own sessions = the member themself (cancel stays creator-scoped for non-admins); org-wide = `org_admin` (list-all + end-any + danger-zone end-all). Platform operator keeps its existing super-powers. This mirrors exactly how AUTHZ-1 scoped capability grants.

### Related gap surfaced (your call whether it's in #756's scope)
Companion per-turn workflows bypass the cap entirely (§2.3). Options: (i) leave as-is + ticket separately (turns are short-lived; the cap was designed for long-running sessions) ✅ rec; (ii) emit started/ended pairs per turn (symmetric but noisy — outbox volume per chat message); (iii) a per-thread "one turn in flight" serialization instead of cap participation. Recommend (i): file the finding, keep #756's scope on the five capped doors.

---

## 7. Build scope (once locked)

| Phase | Work | Est |
|---|---|---|
| 1 — Leak | Shared end-emit Activity + wiring in Spec/Build/Deploy/Skill-creator terminal paths + idempotency + expression-index migration + per-class real-services tests (start→complete→count stable) | ~1.5–2 d |
| 2 — Cap axis | `PER_USER_CAP` setting + second count variant + `scope` field on the 429 + #755 modal copy branch | ~0.5 d |
| 3 — Cleanup + indicator | `GET /agents/sessions` + end-any/end-all endpoints (org_admin) + settings card (list + danger zone + "X of N") | ~1.5 d |

One PR per the one-PR-per-iteration lock unless you want Phase 3 split (backend vs UI).

## 8. Lock questions

1. **D1**: Option A (workflow-exit emission)? Sweeper backstop in-scope or separate ticket?
2. **D4 axis**: dual cap (org ceiling + per-user fairness)? Default `PER_USER_CAP` value (proposal: 10)?
3. **D4 cleanup scope**: `org_admin` role flag (house pattern) — or do you want a dedicated capability?
4. **D2 location**: usage page / security page / new settings page?
5. **Zombie backfill**: danger-zone manual cleanup suffices, or one-time script in the PR?
6. **Companion cap-bypass** (§2.3): separate ticket, or fold minimal handling into #756?
