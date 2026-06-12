# Pitch Deck — Internal Working Notes

**Status**: Internal-only. Not shared with the team or with Mars.

**Companion to**: `AMIRA_PITCH_DECK.md` and `AMIRA_PITCH_DECK.docx` (the team-facing draft).

---

## What needs the platform mockup / visuals

These slides have `[VISUAL: ...]` placeholders that need real assets before the deck is sent to Mars:

- Slide 4 — 3-step pipeline visual
- Slide 7 — Canvas screenshot / 3-panel mockup
- Slide 10 — skills gallery icons grid
- Slide 16 — mini-app icons grid
- Slide 17 — architecture diagram
- Slide 18 — deployment-options visual
- Slide 23 — closing graphic (optional)

## What may change after the platform documentation lands

Content that might need adjustment based on the platform team's mockup + documentation:

- **Slide 14 (working today)** — confirm the operational vs in-build vs roadmap status of each component
- **Slide 6 (Specifications phase)** — confirm spec output format. Meeting notes mention "downloadable PDF" — is the spec stored as IEEE markdown internally with PDF as export, or has the markdown layer been dropped entirely?
- **Slide 12 (governance)** — confirm exact wording of the "compliance metrics document" referenced in the morning meeting. Is this the rolling compliance matrix from prior versions feeding into the next spec phase, or a baseline rubric the user references at the start?
- **Slide 19 (auth & API keys)** — confirm centralized-pool / AI-foundry pattern naming Mars uses internally

## Open questions to consider before finalization

Content additions or framing changes that haven't been resolved yet:

- **Timing for Phase 2** — current draft is timeline-light. Mars may want indicative dates. Decision: leave timeline-light unless Mars asks for it.
- **Spec-driven development paradigm shift** — currently Slide 2 frames the problem as "vendor cycles too slow." We could explicitly call out the spec-driven shift Mars endorsed in their planning email. Worth considering for stronger framing.
- **Cost-comparison slide** — *"3 weeks with Amira vs 3 months traditional"* framing from the original Phase 2 planning email. Could be a powerful slide between Slide 15 (FinIQ proof) and Slide 16 (replication). Hold until the team confirms the comparable.
- **Voice / audio surface** — currently mentioned only in Slide 17 (architecture). Could deserve a dedicated slide given the FinIQ voice agent is operational and demo-able.
- **Specific replication targets named** — currently kept generic ("CPG / consumer goods sector"). Whether to name specific clients (Hershey, Campbell, PepsiCo) is a Mars-comfort question — naming competitors might be jarring or might validate replicability. Recommend keeping generic unless Rajiv specifies otherwise.

## Format target

- When visuals land: generate `.pptx` via python-pptx (Mars-branded template if available; otherwise neutral professional)
- Estimated 30–45 minutes for the `.pptx` production once visuals are in
- The `.docx` version is the intermediate format for team review; final deliverable to Mars is `.pptx`

## Scrubbing discipline

Before any external send (and before final QA), grep-verify:

- Team member names — Farzaneh, Cesar, Rajiv, Alessandro, Savino, Chandrasekaran, Flores, Ashwin, Atif, Bruce, Kumar, Matt, Hutton, Danny, Woodruff, Bill, Dennis, Ishaq, David, Asimov, Atlas, Artemis, Claudio
- "Project lead" attributions — none
- Internal LLM-vendor names in slide content — Anthropic, Claude Code (the platform-tech detail Mars doesn't need)

Same scrubbing discipline as `SPEC_AGENT_DESIGN.md` v0.6.

## Deltas vs SPEC_AGENT_DESIGN.md v0.6

For internal alignment — what the platform meeting notes added that may flow back into v0.7 of the spec doc:

| Topic | v0.6 says | Meeting / repo reality | Action |
|---|---|---|---|
| Spec output | IEEE Word + markdown | "Downloadable PDF" per meeting | Clarify in v0.7: PDF is export; markdown is the canonical Build Agent input |
| Compliance metrics in Spec phase | Compliance matrix is post-build (FR-32) | Meeting: referenced **during** Spec phase | Clarify in v0.7 — likely the rolling matrix from prior versions |
| Human governance | Approval at draft→approved | Meeting: pre-build AND pre-deploy gates | Add explicit code→deploy gate FR to v0.7 |
| Skill wrappers for common tools | Implicit | Meeting: wrap engineering/financial tools | Add to v0.7 §10.5 |
| Versioning | FR-30/31 | Not yet implemented in repo | No change — design is ahead of implementation, that's expected |
| Builder tech | "agentic code-generation engine" | Repo: Claude Agent SDK explicitly | Doc stays portable; no change needed |
