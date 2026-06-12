---
name: verify-subagent-claims
description: "Verify a subagent study's load-bearing claims against the source before baking them into a proposal/ticket — one misread can invert the design's priority ordering"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 865f4eec-9f0d-42a4-84f4-46f0ab7b8fca
---

From the #756 session-cap brainstorm (2026-06-10): a terminal-states study subagent reported that companion chat turns **leak one `agent.session-started` row per turn** (O(N) per thread — would have made companion the top-priority leak source in the proposal). A 2-minute self-verification against `companion/api/routes.py:360` showed the **opposite**: the turn route starts `CompanionAgentWorkflow` directly via `temporal.start_workflow`, never touching `start_agent_session` — so companion turns emit no session row at all. Not a leak; an **enforcement gap** (turns bypass the cap entirely). The corrected finding became its own lock question instead of a false priority.

**Why:** subagents synthesize across many files and will occasionally bridge a gap with a plausible-but-wrong inference (here: "the chat route surely calls the standard start path"). The error rate is low, but the cost is highest exactly on the claims that drive prioritization or design.

**How to apply:** before publishing a proposal, ticket, or design comment built on subagent studies, identify the 1-3 **load-bearing** claims (the ones that would change the recommendation if false) and verify each against the cited source yourself — a targeted grep + reading the actual call site is usually enough. Non-load-bearing detail can stay study-sourced.

Related: [[verify-consumer-receives-not-just-producer-emits]] (read the bridge, don't assume it), [[probe-real-behavior-not-local-smoke]].
