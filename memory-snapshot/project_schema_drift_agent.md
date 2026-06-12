---
name: Schema-drift detection agent — proposed design
description: Platform-level primitive for auto-detecting/resolving upstream schema changes. Three-bucket detector + auto-resolver + log. Proposed 2026-04-22, NOT greenlit, Farzaneh running by team.
type: project
originSessionId: b22fb3dd-251d-4e8f-a022-7729b018094f
---
**Status (2026-04-22)**: proposal only. Farzaneh is running this by the team. Possibly green-lit to build "soon, not now." Do NOT start implementation without explicit approval.

## Trigger incident

**2026-04-22 ~8:48 AM** — Matt Hutton (Mars) renamed the authoritative Databricks schema. Three axes of drift in one incident:

1. **Column naming**: `Unit` → `Entity`, `RL` → `Account`
2. **View names**: `finiq_vw_pl_unit` → `finiq_vw_pl_entity` (and `_ncfo_` variant)
3. **Catalog/schema source**: `corporate_finance_analytics_prod.finsight_core_model` → `corporate_finance_analytics_dev.finsight_core_model_mvp3`

The Mars-deployed Amira/FinIQ instance broke. Kumar confirmed the old table wasn't present, David flagged the error, Matt clarified: *"There has been a change in terminology from previous model to new model. Unit (in all scenarios) is now known as Entity. Reporting line changing to account."* Cesar pinged Farzaneh asking (a) how long to fix and (b) how to prepare for future changes.

**This is the SECOND rename in ~3 weeks**, going opposite directions:
- **2026-03-31**: Entity→Unit (we rebased synthetic + code to match production, which used Unit/RL at the time)
- **2026-04-22**: Unit→Entity (Matt shifted authoritative catalog back to mvp3, which uses original Entity/Account naming)

This establishes that schema drift is a **recurring operational pattern**, not a one-off — argument for investment.

## WhatsApp origin of the design (FinIQ GenAI group chat)

- **Cesar 11:18**: *"a safety layer that runs every now and then and updates the references to the tables, that way we evolve the knowledge of the system"*
- **Cesar 11:19**: *"a simple persistence layer that acts as the brain for each app that is built by amira, and that works as a log of changes from the external services that the app connects to"*
- **Cesar 11:19**: *"so we know when these things happened and what trigger an 'update memory' event"*
- **Farzaneh 11:20**: *"a schema-drift detection agent"* 👍
- **Ale 11:20**: *"the app itself should track its own evolution together to what made it change that way"*
- **Ale 11:20–21**: *"Like a versioning of the specs and all subsequent additions and edits… tie a given version of the spec to a given version of a git commit or label"*
- **Cesar later**: *"I think it should take care of itself, but write to a log like table or document that is accessible for humans to see when these drifts were detected and what it did to update its knowledge"*

**Farzaneh synthesis**: three-bucket detector/auto-resolver/log-for-audit, scoped to drift only (brain is future-state), goal = avoid app breakage from small mechanical changes without silently returning wrong data.

## Architecture (three-bucket design)

**Six components:**

| # | Component | Role |
|---|---|---|
| 1 | **Alias map** (YAML, versioned in git) | Logical → physical bindings (e.g., `entity_table → finiq_vw_pl_entity`). Versions v1.0 → v1.1 → v1.2, one commit per resolved drift. Ale's versioning preference applies here. |
| 2 | **Schema snapshot** (JSON, git) | Frozen copy of upstream schema at last "known good" state. Diff source for the detector. |
| 3 | **Detector** | Scheduled job (nightly). Fetches live schema via Databricks SQL Statements REST API. Diffs against snapshot. |
| 4 | **Classifier** (rule-based) | For each diff, routes to bucket 1/2/3 using dtype match, name similarity, value-distribution overlap. No LLM for common case. |
| 5 | **Resolver** | Applies fix for buckets 1 and 2. Does nothing for bucket 3. Atomic: alias map + snapshot + log entry committed together. |
| 6 | **Log + notifier** | Append-only (Postgres table or JSONL). Slack/Kanban webhook for review flags. |

**Three buckets:**

| # | Condition | Action |
|---|---|---|
| 1 | Unambiguous rename — single candidate, dtype matches, value-distribution overlap >0.95 | Auto-resolve, bump alias map, log entry, FYI notification |
| 2 | Ambiguous but best-guess feasible — multiple candidates, heuristic picks one, score gap >0.2 | Auto-resolve best guess, log entry with "review me" flag, non-blocking review card (human verifies async) |
| 3 | Can't solve — table gone with no replacement, shape change, row count shift >50% | DON'T guess. Flag for rapid human review. App keeps running on last-known-good alias map until decision. |

**Goal duality**: avoid silent **breakage** (buckets 1 and 2 handle mechanical renames) AND avoid silent **wrongness** (bucket 3 refuses to auto-fix when confidence is absent).

## End-to-end flow (the version Farzaneh retraced and approved)

```
T0:  Alias map v1.0  →  app reads this  →  everything works
     Snapshot v1.0   =  frozen copy of upstream schema

T1:  Upstream changes (e.g., Matt renames unit → entity)

T2:  Detector runs (scheduled, nightly)
     Fetches live schema → diffs against Snapshot v1.0
     Finds the rename

T3:  Classifier inspects
     Single candidate, dtype matches, value distribution matches 0.98
     → Bucket 1 (auto-resolve)

T4:  Resolver applies fix atomically:
     - Alias map → v1.1 (new binding)
     - Snapshot  → v1.1 (captures live state)
     - Log entry written ("auto-fixed, bucket 1, conf 0.98")
     - Slack/Kanban notification ("FYI — fixed a thing")

T5:  App reads alias map v1.1 on next reload → works on new schema
```

Bucket 3 path: skips alias map + snapshot updates in T4, writes log entry + alerts only.

## Persistence model

Two forms, together = the "memory of fixes":

1. **The log** (append-only): every drift event + fix preserved forever. Answers *"what happened on date X?"*, *"why is binding Y what it is?"*
2. **The alias map version history** (git): each version = point-in-time snapshot of the app's understanding. Revertable.

This is NOT Cesar's future "brain for each app" — the brain is broader (schema + API contracts + business rules + query history + more). Schema drift is ONE slice. Brain is eventual home, not now.

Ale's spec-versioning instinct maps cleanly to the alias map version bumps.

## Why HITL-on-everything was the wrong framing (my earlier overcorrection)

In the first pass I recommended "never autonomous rewrite, always human-in-the-loop." I was mentally picturing an LLM rewriting **code files**. That's not what Cesar proposed. He proposed updates to a **metadata layer** (the alias map / brain). Crucial distinction:

- Code stays stable (the app references logical names like `entity_table` regardless)
- Only the metadata binding changes (`entity_table` now resolves to `finiq_vw_pl_entity`)
- No git commits touch the app's source code; only the bindings file
- Revert is one file change, not a code rollback

Given that framing, **auto-resolve + audit log is the correct default**. Humans review the log weekly or spot-check, revert anything weird. Blocking every mechanical rename on approval is toil without protection (semantic drift is NOT caught by HITL anyway — only by sample-value checks / golden-query tests). 90%+ of drifts are clean 1:1 mechanical renames.

The HITL guardrail survives in bucket 3 only, for cases the classifier is honestly unsure about.

## What this does NOT handle — semantic drift

If Matt keeps the column name the same but changes its meaning (e.g., `Revenue` now reports gross instead of net), no schema diff sees anything. Shape unchanged. Complementary pattern:

- **Golden query suite** — 5–10 canonical questions run nightly against live Databricks, results compared to stored snapshot. Alert if numbers shift by more than N%.
- Not part of the drift agent itself, but should ship as a paired primitive in the same platform layer.

Worth mentioning to Cesar when the build is green-lit.

## Proposed tech stack (matches Cesar's Amira platform)

- **Python + FastAPI** for scanner service (aligns with Cesar's Amira backend + finiq-data-agent)
- **Databricks SQL Statements REST API** for live schema fetch (stateless, no SDK dependency)
- **Scheduler**: cron in container, or Azure Functions timer trigger
- **YAML for bindings** (extends Cesar's finiq-data-agent pattern — his YAML semantic layer is the natural substrate)
- **Postgres for log** (queryable, dashboard-friendly)
- **Slack webhook for notify** (simplest)

## Build sequence (when/if green-lit)

1. Snapshot + bindings YAML (by hand) — ~1 hour
2. Detector (scan + diff) with notify-only (no auto-resolve yet) — ~1 day
3. Classifier + auto-resolver for bucket 1 — ~1 day
4. Log UI / Kanban integration — ~1 day (depends on Cesar's platform)
5. Bucket 2 flagging + bucket 3 alerting — ~0.5 day
6. Sample-value store for confidence scoring — ~1 day

**Rough total**: 4–5 days for FinIQ-first version. Scales to other apps by adding their bindings YAML — shared detector/classifier/resolver code at platform layer.

## Key decisions to surface to Cesar before building

1. **Per-app repo vs platform repo for bindings?** Recommend: bindings + snapshot per app, detector/classifier/resolver logic shared at platform.
2. **Cadence?** Nightly likely fine; hourly cheap if desired.
3. **Review queue owner?** Cesar's Kanban board is natural fit (aligns with his existing task-management UI).
4. **Sample-value storage shape?** Summary stats (min/max/mean/cardinality/null %), not raw rows — still catches ~90% of value-drift cases.
5. **What's "last-known-good" when bucket 3 fires?** Previous alias map version. If that's also broken (catalog gone entirely), fail loud, not silent-wrong.

## Alternatives considered (from the 8-pattern design survey)

For posterity — here are the other architectural patterns we weighed and rejected or combined:

| # | Pattern | Verdict |
|---|---|---|
| 1 | Indirection / alias layer | ✅ Included (component 1) |
| 2 | Drift detector (notify-only) | ✅ Included (component 3) |
| 3 | Drift agent + HITL (propose-as-PR) | Partially — only bucket 2 flagging, not code-rewrite PRs |
| 4 | Data contract with upstream | ✳️ Political, not technical — pursue separately with Mars |
| 5 | Mediator service | ✅ Evolved into this design; brain is eventual full mediator |
| 6 | Runtime schema discovery (LLM per-query) | ❌ Rejected — token cost, latency, non-determinism |
| 7 | Fallback chain (try new → old) | ❌ Useful for transitions, masks real issues as steady-state |
| 8 | Spec-driven codegen | Deferred — fits if Spec Agent eventually owns schema contracts |

**Two patterns explicitly avoided**: runtime LLM discovery (#6 alone), and any agent that auto-applies code changes without HITL.

## Relationship to Spec Agent plan

These are **independent tracks** per Farzaneh's explicit direction 2026-04-22. Do not conflate:

- **Spec Agent** (`project_spec_agent_plan.md`): Amira Component #1, spec authoring, kicks off with interrogation.
- **Schema-drift agent** (this doc): platform-level primitive, reacts to upstream changes, keeps apps from breaking.

Both could eventually ship under the Spec Agent's umbrella if the team later decides spec-governance owns data-contract maintenance — but treat them separately for now.

## Status going forward

- Farzaneh will run the proposal by Cesar / Ale / Rajiv.
- If green-lit, build sequence above kicks off.
- If not green-lit, this memory stays as the canonical reference for the idea.
- The **immediate** fix for today's Matt-rename incident is a separate task — schema discovery via REST API, then the manual rename across ale-build. Not blocked on this agent build.
