---
name: headless-drive-ops-gotchas
description: "Ops gotchas for headless Spec/Build Agent drives via Temporal (WSL worker identification, stale seed ids, worktree-upgrade mid-session, drive-script poll criteria)"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 865f4eec-9f0d-42a4-84f4-46f0ab7b8fca
---

Lessons from the 2026-06-10 #724 stress repro (headless drives against a master worktree). Applies to any future headless agent-drive session (Spec Agent lockdown, Build Agent loop).

1. **`pgrep -f` self-matches through `wsl bash -lc` wrappers.** The wrapper's command string contains the pattern, so pgrep returns the wrapper's PID alongside (or instead of) the worker's — I mistook our own fresh worker for a stale one and killed it. **Identify workers by `ls -l /proc/<PID>/cwd`** (shows which worktree it runs from), never by pgrep output alone. Also: `ps lstart` times can mislead across the WSL clock.

2. **Drive scripts with hardcoded seed UUIDs go stale across dev-DB reseeds.** `phase12_drive_spec.py` carried May-era org/user ids; the DB had been reseeded since (org count=0). Before any drive: `SELECT u.id, om.org_id FROM app."user" u JOIN app.org_membership om ...` and sed the script's constants. Workspaces may live under a different org than the user's membership (mars-demo vs personal) — direct-SQL seeding doesn't check membership, so any coherent combo works for headless drives.

3. **Worktree-upgrade mid-session is safe and useful.** When master moves mid-test (Cesar merging), you can `git checkout --detach origin/master` in the worktree + restart the worker — the running Temporal workflow continues on the new code at the next activity. Only safe when workflow.py itself didn't change (activity/prompt changes are fine — they're not replayed).

4. **A drive script's poll criterion ≠ the test's verdict.** `drive_refinement_turn.py` reports TIMEOUT unless new rows have `parent_requirement_id` — a turn can succeed by its own goal (gaps resolved, DP resolved) and still "time out" the script. Use the script only to SEND the signal; read the verdict from the DB counts + worker log (`grep -c 'ActivityError\|exceeded max iterations'`) + the reassembled reply text (`string_agg(payload->>'text','' ORDER BY (payload->>'seq')::int)` over recent `text-chunk` outbox rows).

5. **Worker log only captures since its own start** (`>` truncates) — restart boundaries align log content with test phases, which is actually convenient: an empty error-grep over the log IS the per-phase verdict.

Related: [[matrix-walk-backend-first]], [[temporal-test-env-pydantic-converter]].
