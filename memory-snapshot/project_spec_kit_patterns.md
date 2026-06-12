---
name: spec-kit-patterns
description: github/spec-kit methodology reference patterns — consult when M3 Spec Agent design judgment calls arise. Not adopting wholesale; cherry-pick.
metadata: 
  node_type: memory
  type: project
  originSessionId: 0973fe7c-3e3a-47eb-a295-6a31f61d994f
---

**Fact**: Studied github/spec-kit on 2026-05-18 — a spec-driven dev CLI toolkit with mature template patterns. Cataloged here for cherry-picking when T-M3 Spec Agent design judgment calls come up.

**Why**: Cesar's 2026-05-18 binding directive was "review tickets critically; some lack clear instructions". For #84/#91 (M2 foundational), tickets are tight and spec-kit irrelevant. For M3 Spec Agent (`SpecAgentWorkflow`, Readiness rubric, Spec Agent prompt design), spec-kit patterns are immediately applicable prior art.

**How to apply**: When a T-M3 ticket body leaves a design choice open (output format, ambiguity handling, readiness gate shape, task ordering), consult this catalog first before inventing. Surface the choice + this prior art to Cesar if load-bearing.

---

## Spec-Kit Flow (reference)
`constitution → specify → clarify → plan → tasks → analyze → implement` — 7 phases, CLI-driven, file-on-disk artifacts.

## Patterns worth considering for our Spec Agent

### 1. Tagged requirement IDs (`FR-001`, `SC-001`)
Every requirement gets an ID; every success criterion gets an ID. Cross-references everywhere. Our SRS already uses FR1.1 style — Spec Agent should mint these canonically in output.

### 2. `[NEEDS CLARIFICATION: <specific question>]` inline markers
Canonical ambiguity-tracking mechanism. Spec text contains these inline; readiness gate is "zero markers remain". Maps directly to our `SpecRubricUpdate.open_gaps` field already in [narration.py:221](apps/api/src/amira_api/runtime/contracts/narration.py:221).

**Prompt rule**: *"If the instruction doesn't specify something, mark it. Never invent."*

### 3. Three mandatory spec sections
- **User Scenarios & Testing** — user stories with P1/P2/P3 priorities, each with Given/When/Then acceptance scenarios + an "Independent Test" definition (= each story is its own MVP slice).
- **Requirements** — FR-001 format, includes Key Entities subsection.
- **Success Criteria** — SC-001 format, technology-agnostic + measurable.

Plus optional **Assumptions** — explicit list of defaults chosen. Crucial: separates "we assumed X" from "the user said X".

### 4. WHAT/WHY vs HOW separation
Spec = pure WHAT/WHY (no tech stack). Plan = HOW. Our SRS mixes both. Spec Agent should enforce this split in output.

### 5. Constitution-as-cached-system-prompt
`memory/constitution.md` (5 numbered principles + governance) loaded as immutable foundation. We have `plan/00-engineering-standards.md` — could load as `SystemBlock` with `CacheBreakpoint(ttl="1h")` in Spec Agent calls (per plan/06 §2.3).

### 6. Constitution Check as plan gate
Every plan has a section that explicitly verifies compliance with each article. Our Build Agent should produce one per build.

### 7. Complexity Tracking table
Every violation justified: violation | why needed | simpler alternative rejected because. Direct match to Cesar's `architecture/CHANGELOG.md` "simplified 6 times" pattern.

### 8. Foundational / User Story phase split in tasks.md
- Phase 1: Setup
- **Phase 2: Foundational (Blocking Prerequisites)** — blocks ALL user stories
- Phase 3+: One phase per user story in priority order
- Phase N: Polish

Maps cleanly to our M2 (foundational) → M3 (user stories) split. Each story independently testable + deployable — MVP-first.

### 9. `[P]` parallelization markers + `[Story]` traceability
Every task tagged: `[T001] [P] [US1] Description`. Parallel work explicit. Build Agent can use markers to schedule.

### 10. Checkpoint-after-each-story
"STOP and VALIDATE" between user stories. Direct match to our compliance-matrix loop philosophy.

## Patterns we should NOT port
- File-on-disk artifact persistence (we use Postgres + outbox)
- Slash-command-driven phases (we use chat + Temporal Workflow)
- The "Article VII/VIII/IX" naming convention (we have our own area-locked decisions)
- GitHub branch-per-feature (we have Temporal sessions)
- CLI tool / agent-integration shape (we're building our own runtime)

## Concrete elements ready to lift verbatim
- **Spec template skeleton** (`templates/spec-template.md`, 4.5KB) — adapt header section, three mandatory sections, P-priority story format, Given/When/Then acceptance scenarios
- **Plan template Constitution Check + Complexity Tracking sections** (`templates/plan-template.md`, 3.8KB)
- **Tasks template phase structure** (`templates/tasks-template.md`, 9.2KB)

## Related memories
- [[project_amira_first_deployment]] — first deployment platform shape
- [[project_finai_mvp2_plan]] — 17-area implementation plan driving M3 tickets
- [[feedback_cesar_quality_bar_m1_backend]] — Rule 3 second-pass evaluation aligns with spec-kit's "don't guess" stance
