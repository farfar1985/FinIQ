---
name: 3-layer knowledge architecture — per-user / per-project / per-company
description: Architectural conversation 2026-04-27 in the FinIQ GenAI WhatsApp group. Karpathy's knowledge graph proposed for the company-wide tier. Promotion flow + approval chain emerging as a governance requirement. Substrate decision (graph over pgvector vs separate graph store) parked for next sync with Cesar. Decision: NOT in the Mars deck (over-promise risk); tracked as v0.7 design-doc work.
type: project
originSessionId: 5392bc4f-29c8-4e9d-ac1d-dc209c410846
---

## Conversation context

Mid-afternoon 2026-04-27 in the FinIQ GenAI WhatsApp group (after the morning's commercial-proposal call):

**Farzaneh's proposal**: bring in Andrej Karpathy's "LLM-wiki" / Obsidian digital brain pattern — knowledge graphs derived from cross-linked markdown files across projects. References:
- `gist.github.com/karpathy#llm-wiki` — Karpathy's pattern overview
- `github.com/safishamsi/graphify` — turns any project's markdown corpus into a knowledge graph

The pattern: many markdown files per project (specs, plans, learnings, decisions) → cross-linked via wiki-style links (Obsidian's strength) → graph derived from link structure → LLM queries the graph + content together for richer answers than RAG over individual docs.

**Cesar's framing** of how it fits Amira:

> *"the knowledge is in layers, per project, per user and per company. I believe we should we adding a company wide knowledge which goes along the karpathy's approach and the rest of the platform is per user/project granularity."*

**Ale's question and follow-up**:

> *"my question is broader... 'what is the vision for Amira within an enterprise environment'? like Cursor your knowledge, conversation is all local ... it is your stuff, your indices and so on. With Replit you have a way to share some projects with others ... For Amira what are we thinking?"*

After Cesar's 3-layer answer:

> *"the per project/user/company separation is needed .. we all agree on that"*
>
> *"but we need to define a flow where users can share some piece of knowledge with other with a proper process / chain of approval .. and making sure the data is not leaking secrets, privacy info and so on"*
>
> *"otherwise the platform will become a nightmare to manage"*

**Cesar's agreement and caveat**:

> *"yes this should be centralized [the company-wide layer]"*
>
> *"but need to be careful how and what is centralized 👍"*

## The 3-layer model

| Layer | Scope | Reference analogue |
|---|---|---|
| **Per-user** | Your sessions, your indices, your private brain — local-first | Cursor (all local) |
| **Per-project** | Knowledge shared within one project's context, multi-collaborator | Replit (project sharing) |
| **Per-company** | Centralized, organization-wide knowledge that grows as everyone in the company builds | The new layer Cesar wants — Karpathy approach |

**Cesar's stance**: Karpathy's approach for the **company-wide layer** specifically. The lower two layers stay as per-user / per-project granularity (they're already covered by Cursor-style local indices).

**Ale's stance**: agrees, but conditional on a formalized **promotion flow** with approval chain, secret-scrubbing, privacy filters between the layers.

## Where this maps to SPEC_AGENT_DESIGN v0.6

Already partially captured:

| v0.6 section | What it covers | 3-layer mapping |
|---|---|---|
| §10.5 (Skills directory) | Platform-wide skills, role-restricted | Layer 3 substrate |
| §10.6 (User uploads, private/shared scoping) | Knowledge base scoping | Layers 1 + 2 |
| §11 (Learning architecture) | RAG + curated patterns + outcome-weighted retrieval | Layer 3 (cross-session learning) |
| §11.6 (Tenant isolation in learning) | Privacy / leak prevention | Addresses Ale's concern, partial |
| §10.6 promotion clause | *"Promotion of user content to the permanent corpus is a curation step, not automatic"* | Addresses Ale's concern, partial |

**What's NOT explicitly captured in v0.6** (for v0.7):
1. The 3-layer split named explicitly as *user / project / company*
2. Karpathy's graph approach as the substrate for the company tier
3. The explicit promotion flow with approval chain (WHO approves, WHAT gets scrubbed, WHEN it propagates)

## Substrate decision — OPEN

Whether the company-wide knowledge graph sits ON TOP of the existing pgvector RAG (added traversal layer over the same store) or as a SEPARATE knowledge-graph store layered alongside.

**Important framing** (clarified during the chat): pgvector and Karpathy's graph approach are NOT substitutes. They're at different layers:
- **pgvector** = a storage / retrieval primitive (vectors + nearest-neighbor)
- **Karpathy's approach** = a methodology for organizing knowledge (markdown + cross-references + LLM-aided graph construction)

The graph layer adds traversal and relationship structure; pgvector still serves the underlying vector search. Many production knowledge systems use BOTH.

**Question to bring back to Cesar (next sync)**:
> *"For the company-wide layer with Karpathy's graph approach, how do you see it relating to pgvector? Graph topology / cross-reference layer on top of pgvector, or a separate knowledge-graph store alongside? Either way the spec doc can capture it for v0.7 — just want to make sure the architecture is described the way you're building it."*

This frames the question as relationship-not-replacement, defers architectural authority to Cesar, and offers the spec-doc update as our contribution.

## Why this is NOT in the Mars deck (decision)

Three reasons (Farzaneh's instinct, validated):

1. **Phase 3+ feature, not Phase 2.** Adding it dilutes the "what's working TODAY" framing on Slide 15. Mars leadership will read it as roadmap, not differentiation.
2. **Mars leadership doesn't buy graph databases — they buy outcomes.** The graph is *implementation* of the compounding story (Slides 12 + 17), not the *story itself*.
3. **The deck's strength is concrete proof points** (FinIQ, QDL with 6 working tools, Canvas live preview). Adding speculative architecture weakens that.

## Where it IS tracked

1. **SPEC_AGENT_DESIGN v0.7** — extend §10 (Knowledge Layer) with explicit 3-layer model + Karpathy graph framing for company tier. Extend §11 with graph-substrate note for layers 2-5. Adapter-level addition (doesn't break the architecture).
2. **Cesar's roadmap** — Cesar already endorsed it for the company tier; the architectural details are pending his answer to the substrate question.
3. **This memory** — captures the conversation so it survives between sessions.

## Karpathy / Obsidian digital brain references

- `gist.github.com/karpathy#llm-wiki` — Karpathy's overview
- `github.com/safishamsi/graphify` — turns project markdown into a knowledge graph
- "Obsidian digital brain" — common name for the broader pattern

## What FinIQ / Amira already has at "first layer" (markdown corpus, Karpathy-equivalent)

- `CLAUDE.md` (project context)
- `memory/` folder with `feedback_*.md` and `project_*.md` files
- `MEMORY.md` index
- Cross-referenced via markdown links

In the Amira repo: `docs/superpowers/specs/` + `plans/` + `state.md` + `roadmap.md`.

We have the substrate. What we don't have yet is the **graph layer** — the cross-reference traversal, the link analysis, the LLM-aided graph construction. That's what Karpathy's `graphify` (and similar tools) build.

## Lesson for v0.7 design doc revision

The team is converging on what's already in v0.6 — they're just naming it more sharply. v0.7 should:
- Make the 3-layer split (user / project / company) explicit (currently implicit via scoping)
- Name Karpathy graph approach as the substrate for the company tier
- Formalize the promotion-flow governance (Ale's chain-of-approval requirement)
- Resolve the pgvector ↔ graph relationship after Cesar weighs in

This is a clarifying alignment, not a contradiction. v0.6's architecture stands; v0.7 sharpens the language.

## Related memories

- [project_amira_vision.md](project_amira_vision.md) — canonical 3-agent + 3-layer architecture
- [project_spec_agent_design_doc.md](project_spec_agent_design_doc.md) — v0.6 design doc + v0.7 deltas being tracked
- [project_amira_platform_repo.md](project_amira_platform_repo.md) — what's in the platform today (incl. pgvector status)
- [project_amira_pitch_deck.md](project_amira_pitch_deck.md) — pitch deck (where the 3-layer model is intentionally NOT featured)
