---
name: feedback-ci-is-lint-only-dont-chase-green
description: "Cesar's directive (2026-05-28 9:58 PM WhatsApp): the amira-mars CI is NOT real verification — it's lint-only, has no reference to the production cluster, and does no behavioural testing. Do NOT burn effort chasing CI green (especially the openapi-drift gate). The real gate is local real-services runs (real Postgres + real Temporal + real Anthropic)."
metadata: 
  node_type: memory
  type: feedback
  created: 2026-05-28
  updated: 2026-05-28
  originSessionId: 865f4eec-9f0d-42a4-84f4-46f0ab7b8fca
---

## The directive (Cesar, 2026-05-28 ~9:58 PM, FinIQ GenAI WhatsApp)

In response to my message explaining the openapi-drift CI failure on PR #698:

> "yeah the CI is not properly implemented cos right now is only linting, so
> avoid those warnings from the agent, just tell it to avoid wasting efforts
> in the CI since it has no reference to the production cluster and it's not
> doing any real behavioural testing"

## What it means (binding going forward)

1. **The CI is lint-only.** The amira-mars CI (`lint.yml` blob-abstraction + F821 + openapi-snapshot-drift; `alembic-roundtrip.yml`) is shallow — static checks + a snapshot diff. It does **not** stand up the production cluster, does **not** run behavioural tests, and is **not** the source of truth for whether a change works.

2. **Do NOT chase CI green.** Specifically the **`openapi snapshot drift`** gate: it has been **red on master itself since #697** (which left `lib/api/_generated/schema.json` minified while the gate regenerates pretty `indent=2`). Every PR branched off master inherits that red. It is **not** caused by our PRs (when they touch no route/schema) and is **not** worth a fix-up commit on our branch. Leave it red; note it in one line in the PR body; move on.
   - This retroactively confirms the right call on **PR #698** (dropped the openapi reformat commit) and **PR #712 / #699** (left openapi-drift red).

3. **The real gate is local real-services verification.** What Cesar trusts = exactly what we do: run the change against **real Postgres (`amira_test`)** + **real Temporal (`WorkflowEnvironment.start_local`)** + **real Anthropic** where relevant, asserting user-visible behaviour (per `feedback_test_shape_rule.md`). That IS the behavioural testing the CI doesn't do. Keep doing it; it's sufficient.

4. **Don't surface CI-warning noise to Cesar.** He explicitly said "avoid those warnings from the agent" — i.e., don't spend his (or our) attention on CI red that isn't a real-behaviour failure. A one-line note in the PR body is plenty.

## Net behaviour

- PR shows openapi-drift red → **ignore it** (note one line, don't fix).
- PR shows blob-abstraction lint / F821 red → **fix it** (those are cheap correctness lints we control + they pass on clean code).
- Verification effort goes into **local real-services runs**, not CI.
- This holds until Cesar says the CI is rebuilt to do real behavioural testing against a cluster.
