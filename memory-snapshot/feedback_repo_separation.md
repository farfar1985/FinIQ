---
name: Repo separation — personal vs QDT
description: Personal repo (farfar1985/FinIQ) gets CLAUDE.md + memory files; QDT repo (quantumdatatechnologies/fin_iq) gets code only
type: feedback
---

Two repos, different push rules:

- **farfar1985/FinIQ** (personal): Push EVERYTHING — code, CLAUDE.md, memory/, session files. This is for Artemis context sharing.
- **quantumdatatechnologies/fin_iq** (QDT team): Push CODE ONLY to **main** branch (not merged) — never push CLAUDE.md, memory/, or session context files.

**Why:** CLAUDE.md and memory files contain internal agent context, credentials references, and strategy notes that shouldn't be in the shared team repo. Personal repo is private and used for the Artemis + Claude Code review loop.

**How to apply:** When pushing to QDT's repo, only push code changes. When syncing to personal repo, include context files. Use the `personal` remote in ale-build for farfar1985/FinIQ pushes. Always redact secrets (tokens, API keys) from memory files before pushing — GitHub push protection will block them.
