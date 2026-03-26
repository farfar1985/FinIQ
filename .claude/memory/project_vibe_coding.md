---
name: Purely vibe coding approach
description: Team decided 2026-03-26 — no manual coding, strong spec writing, coding orchestrator (agent) builds app from specs
type: project
---

The team decided on 2026-03-26 that the entire project will be "purely vibe coding" — no manual coding, only strong specification writing. A coding orchestrator agent (generic term, not tied to any specific tool) takes the SRS and builds the application.

Key decisions:
- "Claude Code" renamed to generic "Coding Orchestrator" or "Coding Agents" in all docs — allows future flexibility to switch coding engines
- Amira acts as the orchestrating agent: takes a spec, builds an app, deploys it to a URL
- Two-pronged approach: test coding process locally + run on cloud
- Roles shift from coders to architects who define code and testing requirements
- Continuous improvement loop: upload spec → generate product → new requirements via job board → product updates

**Why:** This is the core value proposition — proving that AI-assisted spec writing + coding orchestration can build enterprise apps. The competition (Bill, Rajiv, Farzaneh, Alessandro each taking different paths) will validate this approach.

**How to apply:** All deliverables should be specs, not code. The coding agent consumes the specs. Focus on spec quality and completeness.
