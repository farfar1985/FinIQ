---
name: feedback-deconflict-stale-branch-for-maintainer
description: "Technique to make a stale, conflict-ridden feature branch cheap for the maintainer (Cesar) to merge. Merge master INTO the branch (not rebase) so his squash-merge collapses history; --ours the heavily-conflicted test files then graft his unique tests back; re-point your first migration's down_revision to the new master head to kill multi-head; REGENERATE generated artifacts (schema.json/.d.ts) don't hand-merge; verify on real services after resetting the test DB to clean base. Goal = leave the branch a clean fast-forward into master (merge-tree = 0). Banked 2026-05-29 from de-conflicting #689 (#681) against a master that moved ~4 PRs ahead."
metadata:
  node_type: memory
  type: feedback
  created: 2026-05-29
  originSessionId: 865f4eec-9f0d-42a4-84f4-46f0ab7b8fca
---

# De-conflicting a stale feature branch for the maintainer

**When:** your PR has gone full-conflict because master moved ahead (other PRs merged that touch the same files), and you want the maintainer to be able to merge it with one click — not wade through conflicts himself.

**Goal:** after you're done, `git merge-base origin/master <branch> == origin/master tip` → merging the branch into master is a **clean fast-forward, zero conflicts** (`git merge-tree` reports 0). The maintainer just clicks merge.

## The technique (proven on #689, 2026-05-29)

1. **Merge master INTO the branch, don't rebase.** `git merge origin/master` on the feature branch. Resolve conflicts ONCE in a single merge commit. The maintainer squash-merges your PR, so the merge commit + history collapses to one commit on master anyway — rebasing 13 commits would mean resolving the same conflict up to 13 times for no benefit.

2. **For heavily-conflicted TEST files: `git checkout --ours <file>` then graft.** Take your branch's version of the big test file (your tests + structure), then manually append the maintainer's *unique* tests that landed on master. Don't try to 3-way-merge two large divergent test files line-by-line. Verify the graft: collection count should equal (yours + grafted).
   - Watch for shared-helper drift: if a recently-merged PR consolidated something your tests assert against (on #689 it was an audit-kind consolidation — add+resolve collapsed onto ONE kind), the grafted tests may need a small assertion tweak (we added an `action` filter to a count helper so the idempotent test counted only the resolve emit, not the staging add). Read the merged production code to confirm what it actually emits before trusting a copied assertion.

3. **Kill alembic multi-head by re-pointing YOUR first migration.** If both your branch and master added migrations off the same parent, you get two heads after the merge. Fix: re-point your *earliest* migration's `down_revision` (+ the `Revises:` docstring line) to the **new master head**. Confirm `alembic heads` → single head. The migrations are usually order-independent (different tables) so this is safe; note it in the migration docstring.

4. **REGENERATE generated artifacts — never hand-merge them.** `schema.json` / `schema.d.ts` (OpenAPI snapshot), lockfiles, etc. On amira-mars: `make openapi-snapshot` (which also doubles as a **merged-import smoke** — if `app.openapi()` runs with no traceback, the conflict resolution didn't break an import) + `npx --yes openapi-typescript@<pinned>` for the `.d.ts` (the local `.bin` shim often hits a WSL permission error; `--yes` bootstraps a fresh copy).

5. **Verify on REAL services, and reset the test DB to clean base first.** Stale `amira_test` carries another branch's alembic state (cross-branch pollution). Drop `app`+`audit` schemas + `public.alembic_version`, then let the conftest migrate the full **re-pointed** chain from base — this both avoids pollution AND proves the maintainer's merge will migrate head-to-head cleanly. Then run the impacted test files (real PG / real Temporal). On #689: 42/42 passed.

## Order of operations
merge → resolve code (read merged prod code to align assertions) → `--ours`+graft tests → re-point migration → regenerate artifacts → confirm zero markers repo-wide → `make openapi-snapshot` (import smoke) → reset test DB → real-services tests → commit the merge locally → **push only on explicit confirm** → confirm PR flips to `MERGEABLE/CLEAN`.

## Gotchas
- `git commit -F <path>` under Git Bash needs the `/c/Users/...` path form, not `C:\...` (path gets mangled to `C:/Program Files/Git/...`).
- Docker/Postgres may be down on a resting machine — `docker info` from Windows bash, not WSL (no WSL integration). Don't force a long Docker-Desktop cold-start if the user is away; do the static verification (import smoke + `--collect-only` + single-head + regen) and run the real-PG suite when the stack is up.
- It's a local commit, not a push — fine to commit the merge; **push is the per-action-confirmed remote write.** Don't self-merge (maintainer reviews + merges).
