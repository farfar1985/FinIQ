---
name: Mars's Google preference — preferred, not mandatory
description: Mars asked us to use Gemini / Google Enterprise "as much as possible." Preference not hard constraint. Shapes stack choices for new bots but doesn't force rewrites of existing ones.
type: project
originSessionId: 38239999-13da-4c2d-958c-740f1912cf1c
---
## The constraint (verbatim from Farzaneh, 2026-04-15)

> *"Mars is a very big fan of google. they also asked us to use gemini or google enterprise as much as possible. so the closer we are to google the better."*

And later clarification:

> *"i'm not saying that we should use everything in google, not mandatory i guess. but ideal if they outperform others."*

## Translation

- **Preferred, not mandatory.** We lean Google where it wins; we don't contort the stack to force it.
- **"Outperform others" threshold** — use non-Google pieces where they genuinely do better (e.g., if OpenAI Realtime beats Gemini Live on some metric we care about, we keep OpenAI for that piece).
- **"Closer we are to Google the better"** — directional. Over time, tilt the stack Google-ward.

## Historical context (why this is happening now)

- Mars previously (2026-04-09 call with Cesar) ruled out Anthropic for deployed apps because their Azure AI Foundry doesn't host Anthropic models. That forced our first migration: Anthropic → OpenAI.
- Now (2026-04-15) Mars is expressing a positive preference for Google on top. Their Gemini Enterprise investment is live and they want new work to extend it.
- Net effect: OpenAI is the interim (fine for April 21 demo); Gemini + ADK + Vertex AI Agent Engine is the forward direction.

## What this means practically

### Mandatory (hard constraints)
- No Anthropic models in deployed Mars code (previous constraint, still active)
- Inter-bot protocol = **A2A** (Google-led but industry-open; 150+ enterprise adopters)

### Preferred for new work (post-April 21)
- **LLM**: Gemini 3 Pro (complex synthesis) + Gemini 3 Flash (routine)
- **Voice**: Gemini Live API
- **Agent framework**: Google ADK (v1.0 production-ready)
- **Hosting**: Vertex AI Agent Engine
- **Front door**: Register into Gemini Enterprise web app — Mars users invoke bots from their existing Gemini UI, never see "FinIQ" as a separate product

### Keep what works
- FinIQ today is on OpenAI — stays there for April 21, migrates to Gemini post-demo (Phases A→F, ~6 weeks)
- QML / Q.Enterprise stays (QDT-proprietary, not replaceable)
- FMP API stays (third-party competitor data)
- Databricks stays (Mars's own warehouse)
- Cesar's `finiq-data-agent` YAML semantic layer stays (portable across LLM choice)

## The pitch angle for April 21

Don't promise "fully Google" by demo day. Instead frame as:

> *"Amira is framework-agnostic. Our preferred stack for new Mars work is Google-native — Gemini for inference, Google's Agent Development Kit for orchestration, A2A for cross-app communication (already running in production at SAP, Zoom, and 150+ enterprises), Vertex AI Agent Engine for hosting, registered into Gemini Enterprise as the front door. Existing apps like FinIQ keep what works today; new apps go Google. The platform is open, the preferred direction is your direction."*

This preserves:
- Honesty about current state (FinIQ on OpenAI today)
- Architectural flexibility (platform is agnostic)
- Mars alignment (Google is the forward stack)
- Migration story (6-week roadmap, not a gamble)

## What to flag when this comes up

1. **We just migrated Anthropic → OpenAI six days ago.** Another migration to Gemini is doable but it's churn. Phasing matters — don't promise it before April 21.
2. **Gemini Enterprise registration is a Mars-side step.** Karthik/Matt have to coordinate admin access to Mars's Gemini Enterprise tenancy.
3. **The Google preference actually reinforces A2A.** It was already the right inter-app choice; Mars-alignment makes it the obvious one.
4. **"Preferred not mandatory"** — use Google where it wins. If Gemini Live has a gap vs OpenAI Realtime on a specific dimension we need, the answer is "keep OpenAI for that piece" not "force Gemini and accept the degradation."

## Bot-facing directive

For Asimov / Atlas / Artemis / Air / Claude / future Spec Agent: when specifying or building for Mars going forward, **default to Google's stack (Gemini + ADK + Vertex AI Agent Engine)** unless there's a concrete reason a non-Google piece wins. When in doubt, pick Google. Check with operator when it's a real trade-off.
