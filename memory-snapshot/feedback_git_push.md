---
name: Git push from Claude Code — historically broken, may be fixed
description: GCM historically threw .NET TypeLoadException from Claude Code bash. One successful push 2026-04-20. Try once, fall back to user's PowerShell if it fails.
type: feedback
originSessionId: 01322f08-c136-4f72-b4ed-f930c8172fcc
---
Git Credential Manager has historically thrown .NET TypeLoadException in Claude Code's bash terminal on this Windows machine. Affects the ale-build repo (quantumdatatechnologies/fin_iq).

**Why:** System GCM version mismatch with .NET runtime.

**Current state (2026-04-20):** One clean `git push origin main` from `ale-build/` via Claude Code shell — commit `5284745`. Did not reproduce the TypeLoadException. Possibly fixed, possibly transient (cached credentials from a prior `git fetch` on the same session).

**How to apply:** When the user asks you to push, try once from Claude Code. If it fails with a GCM error, fall back to asking the user to run `git push` from their PowerShell (the commit will already be staged). Do NOT assume it's permanently fixed until multiple successful pushes accumulate.
