# Anthropic SDK stays QDT-side; PydanticAI is Mars-only

**LOCKED 2026-05-21 evening by Cesar's WhatsApp** (Q2 of Spec Agent assessment).

**INDEPENDENTLY RE-CONFIRMED 2026-05-22 by Cesar's PR #389** — his own 760-LOC SDK comparison study at `docs/assessments/2026-05-21-claude-agent-sdk-vs-raw-anthropic.md` reaches the same conclusion via independent research: *"Stay raw. Steal patterns from the SDK source without adopting the framework. Migration is not viable for Amira's v1 architecture; the locks that name 'Claude Agent SDK' by string predate the discovery that the SDK is a Node-CLI subprocess wrapper, not an in-process Python loop. Lock language needs amendment regardless of migration outcome."*

Cesar's PR #389 also flagged that:
1. **This lock file is not copied to `docs/team-locks/` yet** — currently lives only in our local `.claude/projects/...` memory. Cesar cited it in the 2026-05-21 `AGENT-TOPO-1` amendment but the file is absent from the repo's team-locks directory. **TODO 2026-05-23 morning**: copy this file to `docs/team-locks/feedback_anthropic_sdk_stays_qdt_pydanticai_for_mars.md` as a small docs PR.
2. **Architecture wording references "Claude Agent SDK" by string** across `RUNTIME-1` / `RUNTIME-2` / `RUNTIME-6` / `DEPLOY-2` / `AGENT-TOPO-1` but the code never imports `claude_agent_sdk` anywhere. The locks should be amended to "anthropic-sdk-python directly + hand-rolled tool dispatch" wording. Tracked separately by Cesar; may land as part of his PR #389 follow-up or a small docs PR.

The triple-confirmation (Cesar WhatsApp 2026-05-21 + Cesar PR #389 independent assessment 2026-05-22 + our Phase 12 testing 2026-05-23 catching F6 which is a discriminated-union serialization quirk that PydanticAI would have handled transparently) makes this lock airtight for v1. PydanticAI port for Mars-prep is a separate ticket scheduled for after the v1 ship.

## The lock

For platform code under `D:/amira-mars/apps/api/` (QDT-side platform):
- **Anthropic SDK directly.** `client.messages.create(...)` + hand-rolled tool dispatch + hand-rolled retries + hand-rolled hooks.
- **NEVER mid-iteration framework swap to PydanticAI.** Even if the redesign would benefit, do not introduce PydanticAI as part of a feature redesign.

For code in `architecture/mars/` or Mars-bound deployments:
- **PydanticAI** per the Mars architecture lock (`feedback_mars_architecture_lock.md`, 2026-05-08).
- Mars Foundry's OpenAI-compatible endpoint via `OpenAIProvider(base_url=...)`.

## Cesar's exact words (2026-05-21 evening WhatsApp)

> for the second, no, do not go with pydanticAI in this iteration, we will do that separately when we publish this to Mars. For now we will use the anthropic sdk

## Why this matters

The Spec Agent strategic assessment recommended PydanticAI for the redesigned `elicit_turn` Activity (7 reasons cited: Temporal-native plugin, parallel tool calls default-on, RunContext[DepsT], multi-model routing, etc.). Cesar's flip back to Anthropic SDK keeps **house-style consistency** with Build Agent's already-shipped pattern (`process_build_instruction.py` uses `llm.chat(req)` + hand-rolled dispatch). It also keeps the framework decision separate from the feature decision — PydanticAI port becomes its own Mars-prep ticket, not entangled with a redesign.

## Mechanical gate before recommending a framework swap

Before recommending PydanticAI (or any framework swap) on QDT-side code, ask:
1. Is this a Mars-deploy ticket? (If yes → PydanticAI is the right pick.)
2. Is this a feature redesign or a framework migration? (If feature redesign → STAY ON ANTHROPIC SDK.)
3. Is the existing pattern in `apps/api/` already shipped + working? (If yes → mirror that pattern, don't introduce a new framework.)

## What the Spec Agent redesign does instead (Direction D as locked)

- 11-tool ReAct loop inside `elicit_turn` Activity using **Anthropic SDK** directly
- Mirror Build Agent's pattern: `client.messages.create()` + hand-rolled tool dispatch + redaction + audit
- Lose framework conveniences (auto schema from typehints, RunContext, free parallel tool calls, 24+ hooks) — hand-roll them
- House-style consistency with Build Agent
- PydanticAI port is a separate future ticket as part of Mars-prep work, not this assessment

## Filed follow-up

- New ticket post-assessment: "Port Spec Agent + Build Agent runtime to PydanticAI for Mars deployment" — sized at 1-2 weeks once the Direction D execution is shipped on Anthropic SDK
