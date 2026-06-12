---
name: split-local-stack-pin-ports-first
description: "The local Amira stack may be SPLIT across worktrees/branches; before any live drive, pin which dir+branch serves :3000 and :8000 — else your edits land in a tree that isn't running."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 865f4eec-9f0d-42a4-84f4-46f0ab7b8fca
---

After many sessions with multiple git worktrees (`D:/amira-mars`, `D:/amira-mars-test`, `-interviewer`, `-750/-754/-701/-755/-729`), the running local stack can be **split across different worktrees on different branches** — the backend and frontend are NOT guaranteed to be the same tree, and neither is guaranteed to be the worktree you just edited.

**Concrete instance (2026-06-11, #767/#768):** I edited the route + frontend in `D:/amira-mars-test` (branch `767-repo-import`). Turned out **:8000 backend** ran from `D:/amira-mars-test` (`uvicorn --reload` → route edits hot-reloaded ✓) but **:3000 frontend** ran from `D:/amira-mars` on branch `spec-agent-completeness-spike` — a *different* branch, so my frontend auto-fire edit was never exercised there (and `-test` has no `node_modules`, so it couldn't serve the frontend at all). I burned several tool-calls assuming one tree before checking.

**Why:** worktrees accumulate across sessions; whoever last started `make dev`/uvicorn/`next dev` picked some tree, and a later branch checkout elsewhere doesn't move the running process.

**How to apply — pin the topology BEFORE a live drive (not after):**
- **Ports → process → dir:** PowerShell `Get-NetTCPConnection -LocalPort 3000,8000 -State Listen` → `OwningProcess` → `Get-CimInstance Win32_Process` for the command line. :8000 often shows as `wslrelay` (it's in WSL) — then inside WSL: `pgrep -af amira_api` (avoid `|` alternation in the pattern — quoting through git-bash→wsl eats it) and `readlink /proc/<PID>/cwd` to get the real working dir + branch.
- Confirm the **branch** of each serving dir (`git -C <dir> rev-parse --abbrev-ref HEAD`).
- A backend on `uvicorn --reload --reload-dir src/amira_api` hot-reloads route edits — no restart. A frontend on `next dev` hot-reloads its tree's `.tsx` — but only *that tree's*.
- If the frontend serving :3000 is a different branch than your edit, your frontend change isn't live there. Either (a) drive the backend directly to prove the substance (POST the route via the authenticated browser — same effect as the frontend), or (b) accept it can't be visually shown on that :3000 and note it.

Related: [[feedback_headless_drive_ops_gotchas]], [[feedback_matrix_walk_backend_first]].
