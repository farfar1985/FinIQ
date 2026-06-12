---
name: dont-drift-to-customer-shapes-when-drafting-platform-design
description: "When drafting platform-level design (tickets, prompts, schemas, locks) while working on customer-specific session content, customer-shaped vocabulary and patterns will leak in unless explicitly cross-checked. Caught hard 2026-05-28 — my #681 and #682 drafts both baked in FinIQ-shape section taxonomies + LLM-authored regex IDs. Cesar's code-grounded review rewrote #681 wholesale to strip both. The drift is silent and confidence-driven; mitigation is a mechanical pre-draft checklist."
metadata: 
  node_type: memory
  type: feedback
  created: 2026-05-28
  originSessionId: 865f4eec-9f0d-42a4-84f4-46f0ab7b8fca
---

## The drift class

When working with a customer-specific session (Rajiv's FinIQ demo prep on 2026-05-27 evening) and then drafting platform-level design (#681 + #682 tickets) immediately after, **the customer's session shape will leak into the platform design** unless explicitly cross-checked. The leak is silent — the drafts look reasonable on their own; only a code-grounded review against the platform's locks catches it.

This isn't laziness or carelessness — it's a confidence-driven pattern. The session content was fresh and detailed; section names like "Ingestion / Retrieval & Chat / Competitive Intelligence / Dynamic UI" felt like natural categorization vocabulary. ID shapes like `FR-1.1.1` felt like natural extension. **Both were customer-domain leakage masquerading as platform-canonical patterns.**

## Two concrete failure modes caught on 2026-05-28

### 1. Section taxonomy leak (#681 §0 violation)

My initial #681 + #682 drafts both proposed an IEEE-830 section taxonomy:
- `3.1 Ingestion`
- `3.2 Retrieval & Chat`
- `3.3 Reporting & Jobs`
- `3.4 Artifact Management`
- `3.5 Competitive Intelligence`
- `3.6 Dynamic UI`
- `4.1 Performance`
- `4.2 Security`
- `4.3 Data Integrity`
- `4.4 UX Responsiveness`

Every single one of these was lifted from Rajiv's FinIQ session. The agent's Turn 3 reply had used exactly these labels for the finance-intelligence-hub spec. I'd mistaken them for "an IEEE-830-conformant section structure" when they were really **a customer-domain-specific clustering for that one spec**.

Cesar's §0 lock explicitly banned them:
> *"NOTHING in platform code, prompts (v1.txt / evaluator.txt), tests, fixtures, or worked examples may name or assume a specific customer or domain. Specifically BANNED from anything you write: 'Mars', 'FinIQ', and any analyst-app section taxonomy ('Ingestion', 'Retrieval & Chat', 'Competitive Intelligence', 'Dynamic UI', 'Reporting & Jobs', etc.)."*

The correct platform design: sections are **derived per-spec from the spec's own content** — never hardcoded. The agent emits section labels appropriate to the spec it's authoring, not from a platform-wide taxonomy.

### 2. LLM-authored regex ID leak (#681 §3 engineering-standard violation)

The current code has `_REQUIREMENT_ID_PATTERN = r"^(FR|NFR|AC)-\d+$"` at `domain/spec/turn_types.py:121` applied to LLM-facing shapes via `Field(pattern=...)`. The model emitted `FR-3.1`, Pydantic rejected, tool call failed.

My fix proposal: **relax the regex** to `^(FR|NFR|AC)-\d+(\.\d+)*$` to allow hierarchical IDs. I framed this as "supporting Rajiv's sub-requirement ask."

Cesar's correction:
> *"Putting a regex between the LLM and the data and hoping it guesses the format is the antipattern — relaxing it to allow dots only moves the wall (next time it's FR-3.1a / 3.1 / FR 3.1). Per engineering-standards §3 (structured LLM I/O, never regex on strings), the regex gate must go away, not be loosened."*

The right architecture: **IDs are system-to-system. The LLM never mints, parses, regex-validates, or derives meaning from identifiers.** Hierarchy is explicit structured data (`parent_requirement_id` column), not inferred by string-parsing the label. Display label `3.1.1` is DERIVED by the renderer.

I had kept the antipattern and just loosened it. Cesar removed it entirely.

## Mechanical pre-draft checklist (apply before any platform-design draft)

Whenever drafting platform-level scope (tickets, prompts, schemas, locks) — especially after working on customer-specific session content — work through this checklist BEFORE the draft goes out:

1. **Cross-reference §0 of any existing platform lock**. The relevant locks today are `feedback_no_onprem_licensing_narrative.md` and (forthcoming) `feedback_amira_is_not_finiq.md`. Read them as the first action when starting platform draft work, not as a check-after.

2. **Grep your own draft** for customer-domain anchors before submitting:
   ```bash
   grep -iE "\b(mars|finiq|petcare|wrigley|royal\s*canin|nestle|hershey|cocoa|mondelez|kellanova|ferrero|colgate-palmolive)\b" <draft-file>
   ```
   Plus any section names that came from a recent customer session. If anything matches → STRIP.

3. **Check section / taxonomy / category lists in the draft**: where did each entry come from? If you can trace it back to a specific customer's spec, it's customer-shape leak — not platform-canonical.

4. **For LLM-facing schemas**: does any field have `Field(pattern=...)` or any regex validation? If so, **the model is being asked to author / parse a structured string** — that's the antipattern. Pure structured I/O via Pydantic models with NO regex on free-text fields the LLM authors.

5. **For "the model should know X format" instructions in prompts**: same antipattern. If the model needs to author a structured key (ID, label, hierarchical reference), the system should mint it and the model should echo back what the system showed it. Never "the model produces FR-N where N is the next available integer."

6. **For section / grouping / taxonomy instructions in prompts**: do they hardcode names, or instruct the agent to derive per-spec? Latter only.

7. **Re-read your draft against `feedback_no_onprem_licensing_narrative.md`**'s "bidirectional anti-leak" rule: would a strict reviewer reading just this draft (no prior context) detect customer-shape assumptions? If yes, generalize.

## What this lesson does NOT mean

- It does NOT mean avoid drafting platform design while working on customer sessions. That's often the right time (the customer session reveals real platform gaps).
- It does NOT mean defer all platform-design picks to Cesar. He explicitly invites architectural-leverage picks from the team.
- It DOES mean: cross-check mechanically BEFORE submitting, and accept the rewrite gracefully when it happens.

## Trigger conditions for this pattern

The risk is highest when:
- A customer session JUST happened (within hours) — its vocabulary is freshest
- The customer's session was DETAILED and SUBSTANTIVE — provides plausibly-canonical-looking patterns
- The platform draft is being authored in the SAME session that ran the customer work — no cooling-off period
- The customer is the demo-day priority — pressure to ship something that "fits the demo" leaks into platform scope

All four of these were true for me on 2026-05-27 evening (PR #672 work + Rajiv demo prep) → 2026-05-28 morning (#681 + #682 drafts). The drift was nearly inevitable; the only mitigation is the mechanical checklist + accepting that Cesar's review will catch it.

## Linked locks

- `feedback_no_onprem_licensing_narrative.md` (existing) — "bidirectional anti-leak" between QDT-side build + customer tracks
- `feedback_amira_is_not_finiq.md` (Cesar staging, not yet in repo) — explicit ban on customer-domain naming in platform code
- engineering-standards §3 (`plan/00-engineering-standards.md`) — structured LLM I/O, never regex on strings

## How this lesson was caught

Cesar reviewed my #681 + #682 drafts overnight 2026-05-27 → 2026-05-28 and **rewrote #681's body wholesale**. His framing: *"This ticket was rewritten 2026-05-28 after a code-grounded CTO review. The original framing was based on observed agent behaviour, not the code. Verification showed most of that infrastructure already exists, the proposed audit-kind shape conflicts with the established pattern, and the proposed hierarchy-by-string-parsing + regex-gating is the exact bug we're fixing, not the fix."*

The corrected ticket then re-introduced the lock language explicitly in §0 + §4 + §7 — that's how strong the platform-vs-customer separation matters.
