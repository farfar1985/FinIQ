---
name: Avoid corporate jargon when working in amira-mars (Cesar's vocabulary discipline)
description: Cesar's CLAUDE.md commit `bfff88f` (2026-05-05) added an explicit "Avoid jargon" rule: no "triage", "north star", "swimlane", "circle back", "low-hanging fruit", "synergy". Use plain language. Project-specific terms (Authorized Approver, e-signature, Spec/Build/Deployment/Companion Agent, OBO) are deliberate and stay exact. Applies to: PR descriptions, issue comments, code comments, design docs, WhatsApp messages on the FinIQ GenAI group, anything project-facing.
type: feedback
originSessionId: 50903b7b-9718-4c73-ab24-6d193b5dda59
---
**When working on amira-mars, no corporate jargon. Plain language. Project-specific terms stay exact.**

**Why:** Cesar's CLAUDE.md `bfff88f` 2026-05-05 codified this as a non-negotiable. He wants writing that's direct and unambiguous so the team — and the agents — don't waste cycles parsing fluff or guessing what loose phrases mean.

**How to apply:**

### Banned (don't use, even casually)

- "triage" (use: "sort", "look at", "decide what to fix first")
- "north star" (use: "primary goal", "the thing we're optimizing for")
- "swimlane" (use: "track", "responsibility")
- "circle back" (use: "follow up", "come back to this")
- "low-hanging fruit" (use: "easy wins", "what we can ship fast")
- "synergy" (don't use at all — almost always means nothing)

### Project-specific terms — keep exact, don't paraphrase

- **Authorized Approver** (not "approver", "manager", "person who signs")
- **e-signature** (not "approval", "sign-off")
- **Spec Agent**, **Build Agent**, **Deployment Agent**, **Companion Agent** (these are proper nouns naming specific Temporal workflows; don't lower-case them or call them "the AI" or "the agent")
- **OBO** (On-Behalf-Of token exchange — RFC 8693; don't expand it inline unless writing customer-facing docs)
- **MCP**, **MCP server**, **MCP tool** (Model Context Protocol — proper noun)
- **Capability graph** (specific data model; not "permission tree" or "rights graph")
- **Out-of-scope guard** (Build Agent's layer-1 check; not "scope check" or "validator")
- **Track** in `track:ai-agent` etc. — labels are exact strings; don't shorten

### Applies to

- PR descriptions and titles
- Issue comments (`gh issue comment ...`)
- Code comments and docstrings
- Design docs / sketches / runbooks
- WhatsApp messages on the FinIQ GenAI group
- Slack-style team comms
- This memory itself

### Where the rule lives

- `D:/amira-mars/CLAUDE.md` § "Vocabulary discipline" — Cesar's authoritative source
- This file — codified for future Claude Code sessions in our personal memory so we apply it automatically when working on amira-mars

### When you catch yourself

If you're about to write "let's triage these tickets" or "this is the north star for M2" — stop, rewrite. Say what you mean: "let's sort these tickets by priority" or "M2's goal is the LLM adapter shell." Say what you mean.
