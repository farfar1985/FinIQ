---
name: LLM API key env var workaround
description: Claude Code overrides both OPENAI_API_KEY and ANTHROPIC_API_KEY — always use FINIQ_ prefixed fallbacks
type: feedback
---

Claude Code injects its own values for `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` into the environment, overriding the `.env` file values. This silently breaks all LLM calls in the FinIQ app.

**Why:** Claude Code uses these env vars for its own API calls and sets them in the process environment, which Next.js then picks up instead of the .env values.

**How to apply:** Always use the fallback pattern in any code that reads LLM API keys:
- `process.env.FINIQ_OPENAI_KEY || process.env.OPENAI_API_KEY`
- `process.env.FINIQ_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY` (if Anthropic is ever re-added)

The `.env` file has both the standard and FINIQ_ prefixed versions set to the same value. The FINIQ_ version is never overridden by Claude Code.

**As of 2026-04-09**: App uses OpenAI (`gpt-5.4-mini`), not Anthropic. Mars can't use Anthropic models (Azure AI Foundry policy).
