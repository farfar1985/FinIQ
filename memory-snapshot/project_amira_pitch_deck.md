---
name: Amira Pitch Deck — combined commercial + technical Phase 2 proposal
description: 2026-04-28 early morning. FINAL FILES DELIVERED. Pivoted from slides to Word narrative (Rajiv's polished V3 + $300K/yr maintenance line). Cesar's 28 demo screenshots + DEMO_FLOW.md integrated in two formats — INLINE (scattered through body sections) and APPENDIX (Workflow Walkthrough at end). Both versions at D:/Amira FinIQ/Amira_Proposal_for_Mars_2026-04-28_FINAL_*.docx, 6.2 MB / 32 pages each. Slide-format md/docx pair retained as historical / generator pattern. Farzaneh sending both to Rajiv to pick.
type: project
originSessionId: 5392bc4f-29c8-4e9d-ac1d-dc209c410846
---

## 2026-04-28 early morning — FINAL FILES DELIVERED

**Pivot**: Rajiv reformatted V3 from slide deck → Word narrative document (`Amira_Proposal_for_Mars_2026-04-26_Polished.docx`). 11 sections, 10 tables, $1M three-tier commercial model preserved, **new $300K/year maintenance line added** in §10.1. Sent to us for screenshot insertion + TOC rebuild.

**Cesar's demo bundle** (received same evening): `DEMO_FLOW.md` (15-step click-by-click Amira platform demo with expected-state validation per step) + `demo-screenshots.zip` (28 PNGs).

**Two final versions built and delivered to canonical location**:

| File | Strategy |
|---|---|
| `D:/Amira FinIQ/Amira_Proposal_for_Mars_2026-04-28_FINAL_INLINE.docx` | 28 screenshots scattered through Rajiv's body sections at the conceptual point each illustrates |
| `D:/Amira FinIQ/Amira_Proposal_for_Mars_2026-04-28_FINAL_APPENDIX.docx` | Body left clean; all 28 screenshots in dedicated **Appendix A — Workflow Walkthrough** at end, in Cesar's 15-step demo order |

Both 6.2 MB / 32 pages. Same body content, only screenshot placement differs. Farzaneh sending both to Rajiv to pick.

**Mapping plan used** (all 28 screenshots have natural homes; only inline vs appendix placement differs):

| Screenshot | Maps to Rajiv § |
|---|---|
| 01 home-portal | §1.2 Amira at a Glance |
| 02a/b/c spec-new + projects-new + import; 03 spec-finiq decision point | §3.1 Specifications Phase |
| 04 version-history | §3.4 Reversibility & Versioning |
| 05 e-sig route, 06a/b approver pre/post-sign | §5.1 Human Governance & Audit |
| 07 canvas-preview, 08a/b enlarge-chart + working-capital | §3.2 Development Phase (Canvas) |
| 09a resources tab | §4.2 Skills↔Specs |
| 09b skills drawer | §4.1 Proprietary APIs |
| 09c companion agents | §4.3 Apps Become Agents |
| 09d knowledge tab | §5.2 KB & Vault |
| 10 compliance-matrix | §3.2 / §5.1 (referenced from both) |
| 11a-e deploy modal series | §8.2 Deployment Options + §5.1 Approval |
| 12a/b/c skills marketplace | §4.1 + §4.3 |
| 13a/b ask-amira drawer (Q3 + Nestlé) | §4.3 Apps Become Agents |
| 14 project-finiq lineage | §3.3 Artifacts Phase |

**TOC saga and the lesson** (codified separately in `feedback_word_unlicensed_toc.md`):

1. First attempt: real Word TOC field with `updateFields=true` — rendered correctly in Farzaneh's Word (screenshot confirmed) but the field structure **vanished from the saved file**. Hypothesis: her Word is in *"Unlicensed Product · Most features are disabled"* mode, which mangles TOC field serialization on save.
2. Second attempt: static TOC paragraphs with hand-computed page numbers (INLINE numbers verified from her screenshot, APPENDIX numbers estimated) + tab-leader styling — closer but still not Rajiv's exact look.
3. Final fix: **Farzaneh manually rebuilt the TOCs in Word** herself. Her final files dropped in `C:/Users/farza/Downloads/`. I copied them to canonical location.

**Lesson**: don't be too clever with python-docx for non-trivial Word features (TOC fields, complex tab-leader formatting). For a doc going to a Word user with license issues, hand off cleanly to the user to finish in Word.

**Build / repair scripts retained at `D:/Amira FinIQ/`** (didn't ship the final but useful as patterns):

| Script | Purpose |
|---|---|
| `build_two_versions.py` | Builds INLINE + APPENDIX from Rajiv's polished docx + screenshots directory. Inserts images at section ends, generates Appendix A walkthrough section with 15 steps + captions from DEMO_FLOW.md. |
| `replace_toc.py` | Replaces manual TOC with Word TOC field + `updateFields=true`. Failed for Unlicensed Word — keep for reference only. |
| `insert_static_toc.py` | Replaces manual TOC with static paragraphs + tab-leader page numbers. Closer to working but final fix was manual. |

## 2026-04-27 evening update — V3 (slide deck) sent to Rajiv

(Earlier same-day round-trip lifecycle preserved below.)


## Canonical files (in `D:/Amira FinIQ/`)

| File | Purpose |
|---|---|
| `AMIRA_PITCH_DECK.md` | Source markdown, 24 slides, ~22 KB. **Source of truth**. Contains Rajiv's V2 content + our terminology fixes. |
| `AMIRA_PITCH_DECK.docx` | Word version, ~47 KB. **Generated from .md** via `generate_pitch_deck_docx.py`. Content equivalent to V3 sent to Rajiv. |
| `AMIRA_PITCH_DECK_notes.md` | **Internal-only working notes** — open questions, finalization checklist, v0.6→v0.7 deltas. NOT shared with team. |
| `generate_pitch_deck_docx.py` | md → docx generator. Run `python generate_pitch_deck_docx.py` to rebuild docx from markdown after edits. |
| `patch_pitch_deck_v2.py` | Pattern for replaying terminology fixes onto a future Rajiv-edited docx. Reusable when the round-trip pattern repeats. |

## Backups (Desktop)

| File | What |
|---|---|
| `C:/Users/farza/Desktop/AMIRA_PITCH_DECK_V2.docx` | Rajiv's pre-fix version (his edits + our V1 content, before terminology audit) |
| `C:/Users/farza/Desktop/AMIRA_PITCH_DECK_V3.docx` | The version sent to Rajiv (V2 + our 9 terminology fixes + 1 paragraph insertion) |

## Round-trip lifecycle

| Stage | Owner | Content state |
|---|---|---|
| **V1** (ours, 2026-04-27 morning) | QDT | 24 slides, original commercial model (Option A/B), original Slide 15 (Working Today operational/in-build/roadmap status table) |
| **V2** (Rajiv's, 2026-04-27 afternoon, after 4 PM call) | Rajiv | V1 + Slide 15 rewrite (Platform Features taxonomy) + Slide 21 rewrite ($1M three-tier commercial model + Compounding Model framing) + Slide 23 cleared (pending iteration) |
| **V3** (ours, 2026-04-27 evening) | QDT | V2 + 9 terminology fixes ("proprietary skills" → "proprietary APIs"; "Mars's proprietary skills" → "Proprietary APIs"; "trained on Mars data" → "ML model APIs..."; "Mars data lake (QDL...)" split into Databricks + Proprietary APIs lines; etc.) |
| **md sync** (ours, 2026-04-27 evening) | QDT | `.md` source of truth re-synced to V3 content. Slides 15 and 21 rewritten in markdown to mirror Rajiv's rewrites + our fixes. Asks slide kept populated (V3 had it empty). |

## Deck structure (24 slides — current canonical)

| # | Topic | Notes |
|---|---|---|
| 1 | Cover + tagline | |
| 2 | The challenge (8–12 week vendor cycles bottleneck) | |
| 3 | Amira at a glance | "proprietary APIs" terminology applied |
| 4 | The 3-step pipeline (Specifications → Development → Artifacts) | `[VISUAL]` |
| 5 | Three agents, one workflow | |
| 6 | Specifications phase | |
| 7 | Development phase (Canvas) | `[VISUAL]` |
| 8 | Artifacts phase | |
| 9 | Reversibility and versioning | |
| 10 | The differentiator: **Proprietary APIs** | `[VISUAL]`. Title + lead bullet + table headers + QML row + Q Marketing row + Replit/Cursor line all updated for terminology |
| 11 | How skills connect to specifications | |
| 12 | Apps Become Agents | NEW from Cesar's morning notes |
| 13 | Human governance and audit | |
| 14 | Knowledge base and secret vault | |
| 15 | **Platform Features** (Rajiv's rewrite) | 6-category taxonomy table: Core Workflow / AI & Agents / Data & Skills Layer / Governance & Compliance / Data & Infrastructure / User Environment. "Proprietary APIs Integration" row terminology-fixed |
| 16 | Proof point: FinIQ | `[VISUAL]` |
| 17 | Replication roadmap (compounding-not-repetition framing) | |
| 18 | Architecture overview | `[VISUAL]`. Integration points: Mars data lake (Databricks) split from Proprietary APIs (QDL, QML, Q Marketing) — accessed via the platform's pre-wired skill layer |
| 19 | Deployment options (K8s preferred + web-app fallback) | `[VISUAL]` |
| 20 | Authentication and API key strategy | |
| 21 | **Commercial Model** (Rajiv's rewrite) | Three-tier: Platform License **$1,000,000 perpetual** (+ optional annual maintenance), Skill Development **$25K/$50K/$100K** tiers, Application APIs (custom pricing). Compounding Model framing. |
| 22 | Phase 2 scope (6 tracks) | |
| 23 | Asks (8 items) | Currently populated in our md (V3 was blank) — pending Rajiv's iteration after the 4 PM meeting |
| 24 | Closing | `[VISUAL]` |

## Visual placeholders pending Cesar's mockup

7 slides have `[VISUAL: ...]` placeholders to integrate when Cesar ships his pngs + commands:

- Slide 4 — 3-step pipeline diagram
- Slide 7 — Canvas screenshot / 3-panel mockup
- Slide 10 — APIs gallery icons grid (QDL, QML, Q Marketing, etc.)
- Slide 16 — FinIQ screenshot
- Slide 18 — architecture diagram
- Slide 19 — deployment-options side-by-side comparison
- Slide 24 — closing graphic

## Cesar's notes integrated (mid-afternoon 2026-04-27 morning)

Two additions to the platform pattern:

1. **"Every app becomes a reusable agent"** — when a user finishes building an app, the platform auto-generates a companion agent (CLI + Agent Skill). Every shipped app compounds the skills library.
2. **Free chat with app agents** — users chat directly with FinIQ Agent (or any app's agent) via the platform's general chat surface. Same permissions, audit trail, voice-compatible. Apps become callable services, not just destinations.

Reflected in deck as:
- New Slide 12 "Apps Become Agents" (entire dedicated slide with worked example)
- Slide 10 closing bullet about apps becoming reusable skills
- Slide 17 closing rewritten: *"Replication isn't repetition — it's leverage."*

## 4 PM meeting outcomes (2026-04-27, no transcript)

Topics discussed:

1. **Pricing model confirmed**: Platform License $1M perpetual + optional annual maintenance. Skill Development tiered $25K/$50K/$100K. Application APIs custom-priced. NOT per-user.
2. **E-sign / approval-flow governance** — open question with two design options:
   - **Native to platform (Rajiv's preference)**: spec stays in Amira, manager logs in, signs on the platform. Cleaner UX; Amira owns identity-of-record for legal sign-off.
   - **Link out to existing tool (Ale's suggestion)**: spec exported, signed via DocuSign / Adobe Sign / Mars's existing e-sig stack, signature manifest brought back. Mars's existing audit/legal stack handles it; adds a hop.
   - Decision factor: where Mars's audit-of-record lives. If they have an enterprise e-sign workflow approved by Legal, link-out is faster. If they want everything in Amira's audit log for traceability, native is right.
   - Both are technically feasible; the question is which is offered as default.
3. **Off-the-shelf approval-tool question** raised by Rajiv (defined roles: product manager / developer / approver). Open for Mars to weigh in.

## Terminology audit (post-call, 2026-04-27 evening)

Rajiv flagged: *"QDL and QML belong to us [QDT], not Mars. We should be careful not to promise this in documentation. If they have access, it's the API — not the code. And somewhere I saw 'proprietary skills' — should be 'proprietary APIs'."*

Two issues addressed:

1. **Ownership attribution**: QDL / QML / Q Marketing are QDT's IP. Mars accesses them via API through the platform — they don't get the underlying code or infrastructure.
2. **Terminology**: "Skill" is the platform's internal term for "thing the agent can call" — a wrapper. The IP that matters to clients is the **API** itself. Use "skills" for internal architecture, "APIs" for what clients access.

## Patch script pattern (`patch_pitch_deck_v2.py`)

Reusable for the round-trip workflow when:
- Rajiv (or any peer) sends back a docx with their formatting/edits intact
- We need to apply terminology fixes / surgical content edits without losing their content
- Regenerating from our markdown would lose their work

Core pattern:

```python
def replace_in_paragraph(paragraph, old, new):
    if old not in paragraph.text:
        return False
    # Try simple per-run replacement first (preserves run-level formatting)
    for run in paragraph.runs:
        if old in run.text:
            run.text = run.text.replace(old, new)
            return True
    # Fall back: text spans runs. Concatenate run text, replace, put result in run[0], blank rest
    full_text = "".join(run.text for run in paragraph.runs)
    if old in full_text:
        paragraph.runs[0].text = full_text.replace(old, new)
        for run in paragraph.runs[1:]:
            run.text = ""
        return True
    return False
```

For paragraph **insertion** (new bullet): copy existing paragraph's XML element, wipe runs, insert via `paragraph._p.addnext(new_elem)`, wrap with `Paragraph(new_elem, parent)`, add fresh run.

For **table cells**: walk `doc.tables` → `table.rows` → `row.cells` → `cell.paragraphs`, then apply paragraph-level replacement.

## Workflow going forward

**For our edits**:
1. Edit `AMIRA_PITCH_DECK.md`
2. Run `python generate_pitch_deck_docx.py` from `D:/Amira FinIQ/`
3. Result: fresh `AMIRA_PITCH_DECK.docx` aligned with .md

**For Rajiv's edits returning to us**:
1. Receive Rajiv's `.docx` (e.g., `AMIRA_PITCH_DECK_V4.docx`)
2. Either:
   - **(A)** Patch his docx in place using `patch_pitch_deck_v2.py` pattern — preserves his formatting, applies surgical fixes
   - **(B)** Reverse-engineer his content into the .md and regenerate — keeps `.md` as canonical source but loses Rajiv's specific formatting
3. Re-sync `.md` to match the result (so canonical-source-of-truth stays current)

Pattern (A) is faster and preserves Rajiv's work. Pattern (B) is cleaner long-term. Choice depends on how invested Rajiv was in the formatting.

## Lessons codified

1. **`Edit`'s `replace_all` is case-sensitive**. After a terminology pass, verify with `Grep -i` to catch capitalization variants.
2. **For docs that ping-pong between team members**, build a patch-script pattern, not a regenerate-from-source pattern. Preserves the peer's work.
3. **Use the right term for the right audience**: "skills" (platform-internal) vs "APIs" (client-facing). Don't conflate.
4. **Don't add qualifiers without checking accuracy** — *"Proprietary AI APIs"* sounded smart but was wrong because QDL is data, not AI.
5. **Cleanly separate IP ownership in client-facing docs**: what's the client's, what's ours, what's a third party's. Mars (Databricks) ≠ QDT (QDL/QML/Q Marketing) ≠ external (FMP/news).

## Pre-send scrubbing reminder

Before any external send, grep-verify:
- Team member names (Farzaneh, Cesar, Rajiv, Alessandro, Savino, Chandrasekaran, Flores, Ashwin, Atif, Bruce, Kumar, Matt, Hutton, Danny, Woodruff, Bill, Dennis, Ishaq, David, Asimov, Atlas, Artemis, Claudio)
- "Project lead" attributions
- Internal LLM-vendor names (Anthropic, Claude Code)
- Terminology variants ("proprietary skills", "Proprietary Skills", "Mars's proprietary", "trained on Mars data", "Mars data lake (QDL...)") — case-insensitive

## Related memories

- [project_amira_platform_repo.md](project_amira_platform_repo.md) — Cesar's platform repo (source for what's actually built)
- [project_knowledge_layers.md](project_knowledge_layers.md) — 3-layer knowledge architecture (NOT in deck per decision; tracked for v0.7)
- [project_spec_agent_design_doc.md](project_spec_agent_design_doc.md) — v0.6 design doc (currently with Cesar)
- [project_finai_mvp2_plan.md](project_finai_mvp2_plan.md) — Phase 2 scope context
- [project_amira_vision.md](project_amira_vision.md) — canonical 3-agent + 3-layer architecture
