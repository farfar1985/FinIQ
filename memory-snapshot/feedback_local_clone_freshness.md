---
name: Always git-fetch + git-pull before reading the amira-mars clone
description: Cesar pushes to amira-mars throughout the day. The local read-only clone goes stale within hours, and reasoning from a stale clone produces wrong answers. Always refresh before any read or planning step.
type: feedback
originSessionId: 50903b7b-9718-4c73-ab24-6d193b5dda59
---
Always run `cd D:/amira-mars-readonly && git fetch origin --prune && git pull --ff-only origin master` at the start of every session, and again before any planning step that depends on the current repo state.

**Why**: On 2026-05-05 the local clone went 8 commits stale in ~5 hours. I told the user *"`scripts/whats_next.py` doesn't exist yet"* based on `ls scripts/` against the stale clone. The user then sent the GitHub URL showing the file at `master` — proving it existed, the clone was just behind. That answer was wrong and embarrassing because the cost of `git fetch` is ~1 second; the cost of speculating from stale state is reasoning errors that compound.

**How to apply**: Before any of these actions, refresh first:
- Reading any file in `D:/amira-mars-readonly/`
- Saying "X exists" or "X doesn't exist" about the repo
- Running grep/find scans across the repo
- Running `whats_next.py` (eventually)
- Reasoning about milestone status, ticket queue, or Cesar's progress
- Drafting messages that reference repo state

If a user shows a URL pointing at a file in the repo and our clone says it's not there, **the clone is stale, not the file missing**. The first response is `git fetch + git pull`, not "doesn't exist."

**Cesar's velocity**: He pushed `cd1530b` (whats_next.py + seed_github_issues + advance_milestone), `1af5551` (M0-M6 milestone restructure), `0a4abbe` (MFA/Rego/OPA/Cedar/OpenFGA/Terraform strip), `58af02f` (local dev docker-compose), `4a451d6`+`3444b79` (image pins), `f630d0d` (owner:ale + owner:rajvi labels) all in roughly the same afternoon. Expect this rate during the build.

**Same applies to the OLD `amira` repo clone at `D:/amira-platform-readonly/amira/`** — refresh before referencing PR #1 phase status.
