---
name: uv.lock and pyproject.toml two-PR conflict resolution
description: When two PRs both modify pyproject.toml + uv.lock with new deps, hand-merging uv.lock is a non-starter. Pattern: take master's lock as the base, regenerate via `uv lock` to add the second PR's deps. pyproject.toml resolves manually as "keep both" entries.
type: feedback
originSessionId: 50903b7b-9718-4c73-ab24-6d193b5dda59
---
When merging or rebasing a PR onto a master that has another PR's lock-affecting changes already applied, do NOT hand-merge `uv.lock`. Take master's lock and regenerate.

**Why:** Hit this 2026-05-06 multiple times during the 7-PR merge batch. T-M2-23 (anthropic dep) merged first, then T-M3-37 (xxhash + hypothesis deps) hit a 3-way merge conflict on `pyproject.toml` AND `uv.lock`. uv.lock is a 2000-line auto-generated file with cross-package version constraints — manual merge is error-prone and likely to produce a non-resolving lock that uv rejects.

Same pattern hit again on T-M2-24 + T-M2-25 + T-M2-26 rebases (each had T-M2-23's parent commit baked into the branch + needed master's now-merged version of contract.py instead).

**How to apply:**

1. **`pyproject.toml`** — manual resolution, "keep both":
   - Open the conflict markers
   - For two added dependency entries that don't overlap (e.g., `anthropic>=0.99` from one PR, `xxhash>=3.5` from the other), keep both lines
   - For dev deps section, the merge usually auto-resolves cleanly (different lines added)
   - Verify no markers left: `grep -c "<<<<<<\|>>>>>>" apps/api/pyproject.toml` should return 0

2. **`uv.lock`** — regenerate, never hand-merge:
   - During rebase: `git checkout --ours apps/api/uv.lock` to take master's version (note: during rebase `--ours` is the branch-being-rebased-onto = master, opposite of regular merge)
   - `cd apps/api && uv lock` — adds the new deps from the now-merged pyproject.toml, leaves master's existing pinned versions alone
   - Verify expected packages present: `grep "^name = \"<pkg>\"" apps/api/uv.lock`
   - `git add apps/api/uv.lock`

3. **Continue rebase**: `git rebase --continue`

4. **Verify the rebased branch still passes tests** before force-pushing — `uv lock` could in theory bump a transitive dep that breaks something. In practice for our 7-PR sequence, every test still passed after regen.

---

## Sibling pattern: Alembic revision-id collision when two PRs add migrations the same day

**Caught on PR #337 (T-M3-42) — 2026-05-19 EOD.** I picked revision id `20260519080000` for my migration in the morning when the latest on master was `070000`. Cesar's overnight ships (#327 T-M3-68 + #328 T-M3-69) ALSO claimed `080000` + `090000` — same date prefix, same hour, three different authors. CI's `alembic-roundtrip` workflow surfaced this loud:

```
alembic.util.exc.CommandError: Multiple head revisions are present for given argument 'head'
UserWarning: Revision 20260519080000 is present more than once
```

**Why:** revision ids use a `YYYYMMDDHHMM00` timestamp prefix convention; on busy days multiple authors land migrations within the same hour and collide.

**Fix** (mechanical):

1. `git mv` to a fresh slot: `apps/api/migrations/versions/<oldRev>_<slug>.py` → `<newRev>_<slug>.py` where `<newRev>` is the next free slot beyond current head.
2. Inside the file:
   - `revision: str = "<newRev>"` (was `<oldRev>`)
   - `down_revision: str | None = "<actualLatestOnMaster>"` (was `<oldDownRev>` which is now claimed by someone else's `<oldRev>`)
3. Verify: `alembic heads` returns exactly one revision; `alembic history` shows a linear chain.

**Detection:** add `gh run watch <run-id>` or push + wait for the `alembic-roundtrip` CI workflow result before assuming a migration is clean. Locally on Windows the `alembic upgrade head` runs into ProactorEventLoop issues so the collision doesn't surface until CI.

**Preventive measure for the next time:** before adding a new migration, run `ls apps/api/migrations/versions/ | tail -3` to see what slots are taken on the current pull of master. If the date prefix is already taken twice in the same hour, jump ahead an hour or two.

**Caveat on `--ours` vs `--theirs` during rebase:**
- During rebase, `--ours` = the branch being rebased ONTO (target = master)
- During rebase, `--theirs` = the commits being replayed (source = your work)
- This is INVERTED from a regular merge. Easy to get wrong; always verify by grepping for an expected package after the checkout.
