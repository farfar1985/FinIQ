---
name: FINIQ_ANTHROPIC_KEY env var required
description: Claude Code overrides ANTHROPIC_API_KEY with empty string — always use FINIQ_ANTHROPIC_KEY as primary in FinIQ app code
type: feedback
---

Always use `process.env.FINIQ_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY` when reading the Anthropic API key in the FinIQ app.

**Why:** Claude Code sets `ANTHROPIC_API_KEY=""` in its environment, which overrides the `.env` file value. This silently breaks the query engine, jobs route, and LLM query lib — they return null/error with no visible error message.

**How to apply:** Any new code that needs the Anthropic key must use the fallback pattern. The `.env` file has both `FINIQ_ANTHROPIC_KEY` and `ANTHROPIC_API_KEY` set to the same value.
