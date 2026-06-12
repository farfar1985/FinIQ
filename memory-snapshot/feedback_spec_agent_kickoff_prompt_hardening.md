---
name: feedback-spec-agent-kickoff-prompt-hardening
description: "When prompting the DEPLOYED Spec Agent (amira.qdt.ai, pre-#681) — especially for a demo: (1) the '(FR-1.1, FR-1.2, …)' sub-requirement instruction is a cold-kickoff OVER-BLOOM TRIGGER — it fights the deployed flat-ID schema, the agent waffles on the ID scheme mid-turn and ActivityError's (~50% of cold kickoffs fail this way). HARDEN the prompt: tell it 'requirement IDs are flat integers, write sub-reqs inside each FR's detail text, do NOT create separate entries' + an explicit NFR clause. (2) Keep top-level FRs ≤9 (steer '7-8 top-level FRs, sub-reqs in detail') to dodge the deployed FR-id STRING-SORT bug (FR-1, FR-10, FR-2…) — unbounded 'redo from scratch / beat X' prompts blow to 30 FRs + sort-bug + stall. (3) To force a gap to resolve live, add 'where a data source/integration/dependency is unspecified, raise it as an open gap rather than assuming.' (4) For demos, NEVER run a cold kickoff live (~8min + ~50% flaky) — pre-build, save, REUSE the saved spec; do the 'watch it adapt' beat as a SCOPED gap/dp resolution. Validated 2026-06-02/03 across 5 deployed runs prepping the Mars demo."
metadata:
  node_type: memory
  type: feedback
  created: 2026-06-03
  originSessionId: 865f4eec-9f0d-42a4-84f4-46f0ab7b8fca
---

# Prompting the deployed Spec Agent (amira.qdt.ai) — hardening + demo discipline

Learned 2026-06-02/03 prepping the 2-prompt Mars demo (RFNova telecom + financial), across 5 deployed kickoff runs + the resolution beats. The deployed agent is **pre-#681** (flat-ID schema `^(FR|NFR|AC)-\d+$`, sub-reqs encoded as text in the detail, no #722 natural-sort fix).

## 1. The `(FR-1.1, FR-1.2, …)` instruction is a cold-kickoff over-bloom trigger
Asking the agent to "decompose each FR into numbered sub-requirements (FR-1.1, FR-1.2, …)" **collides with the deployed flat-ID schema** (dotted IDs are forbidden). The agent then has to *improvise* how to represent sub-reqs, and it does so **differently each run**:
- sometimes it encodes "FR-1.1" as text in the detail (clean — run #1 `cf2147ef` ✅),
- sometimes it **waffles mid-turn** ("Requirement IDs must be flat integers… I'll switch the scheme: mint each sub-req as a flat FR-N with the parent area in the title"), which **burns the turn budget → `elicit_turn` ActivityError (#724), nothing persists** (run #2 `59df3b1e` ❌).

→ **Cold kickoff is ~50% reliable** with this instruction. **HARDEN the prompt** — pre-resolve the flat-ID question so it never waffles:
> *"Organize the spec around seven to eight top-level functional requirements (FR-1 … FR-8). **Because requirement IDs are flat integers, write each FR's sub-requirements as a numbered list inside that requirement's detail text (e.g. "FR-1.1 …", "FR-1.2 …") — do NOT create separate top-level requirement entries for sub-requirements.** Also include three to four non-functional requirements (NFR-1, …) … Give each top-level FR a measurable acceptance criterion."*

Validated: hardened RFNova run #3 `8ec58b25` ✅ (clean, no waffle, no error). **Add the explicit NFR clause** — the first hardened run dropped NFRs (0) without it; with it, financial `c3f07b44` = 8 FRs + 4 NFRs.

## 2. Keep top-level FRs ≤9 — dodge the deployed FR-id string-sort bug
Deployed lacks our #722 natural-sort fix, so the FR list **string-sorts** → FR-1, FR-10, FR-11 … FR-2, FR-20 … FR-3 the moment there are ≥10 FRs (ugly in a demo). Steer the agent to "**7-8 top-level FRs, depth in sub-reqs**" → ≤9 → renders FR-1…FR-9 cleanly. **Anti-pattern:** an unbounded "redo from scratch / make it superior to <competitor>" turn → the agent goes exhaustive → **30 flat FRs + full sort-bug + stall** (`spec-371945d0`). Bound it.

## 3. To get a gap to resolve LIVE, induce it
A *complete/detailed* prompt can leave the agent nothing to flag → **0 gaps** (financial `c3f07b44` had 0 → no "watch it adapt" beat). Add:
> *"Where a data source, integration, or external dependency is not specified — which warehouse, which feed, which identity provider — raise it as an open gap rather than assuming a default."*
→ reliably surfaces the gaps you want (financial `2ef3c62d` → gap-1 warehouse / gap-2 CI-feed / gap-3 IdP). Note: the propagation engine sometimes surfaces as a **decision point (dp-1)** rather than a gap — gaps/dp vary per run, so tailor the resolution wording to the actual id you see.

## 4. Demo discipline — never run a cold kickoff live
A kickoff is ~8 min **and** ~50% flaky. So for a demo:
- **Pre-build the spec, save it, and REUSE the saved session** (it stays in Projects). Don't kickoff in the room.
- Do the "watch it adapt" beat as a **scoped gap/dp resolution** on the saved spec: *"Resolve <gap/dp-id> only — don't change anything else."* Scoped → converges in ~1 min, no over-bloom.
- **REFRESH after each resolution** (#690 stale-tab — the spec doc doesn't auto-update; an un-refreshed tab makes a *successful* turn look failed).
- Keep the saved demo spec **pristine** (gaps/dp unresolved) until the demo — rehearse resolutions on a throwaway.
- The lifecycle finale: **route for e-signature** (Authorized Approver e-signs → APPROVED → handed to the Build Agent = next stage). The handoff to Build is the **approval**, not anything typed in the Spec chat box.

## Also
- The deployed **Spec Agent has no web search** (`SPEC_AGENT_TOOLS` has none; the platform LLM layer supports Anthropic `web_search`/`web_fetch` server-tools per T-M3-101 but the Spec Agent doesn't enable them). Naming a vendor/URL (e.g. "iBwave (iBwave.com)") is a **training-knowledge anchor**, not a live fetch — still enriches the spec.
- Drive/read the deployed UI via Claude-in-Chrome MCP (see `feedback_browser_mcp_live_diagnosis.md`): type into the composer via the native-setter + dispatch `input` (it auto-submits); read the persisted spec via a FRESH reload.
