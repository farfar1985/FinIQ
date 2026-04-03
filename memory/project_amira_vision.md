---
name: Amira platform vision — machine that builds machines
description: FinIQ is first mini app in Amira platform. Platform builds, hosts, and orchestrates multiple specialized apps with A2A communication.
type: project
---

## Amira Platform Architecture (2026-04-01)

**Rajiv's definition:** "What we are building for Mars is two things: 1) a machine (FinIQ app) and 2) a machine that builds this machine — Amira."

### Three Layers (Ale's framing)
1. **Mini-agents** — dedicated to one job each (e.g., Cesar's databricks-agent)
2. **Mini apps** — unified apps like FinIQ, each serving a domain
3. **Amira platform** — watches, learns, builds, and maintains everything

### How It Works
- **User** describes what they need to Amira
- **Amira** writes specs (SRS, design guidelines, compliance matrix)
- **Amira** either routes to an existing mini app, builds a new one, or combines capabilities
- Each mini app is self-contained but interoperable via A2A/MCP protocols
- Compliance matrix loop automated — build, test, improve

### Mini Apps (Current + Future)
- **FinIQ** — financial analytics (BUILT, first proof of concept)
- Supply chain app — logistics, inventory (future)
- Health data app — pet care scans, dental data (Martin's prototype exists)
- Marketing analytics app — campaign performance (future)
- Forecasting app — budget projections (future)

### Inter-App Communication (Future)
- FinIQ asks Forecasting: "What's Q3 budget projection for Petcare?"
- Forecasting asks Supply Chain: "What's expected cocoa cost impact?"
- Marketing asks FinIQ: "How did A&CP spend correlate with organic growth?"
- Protocol: A2A or MCP (decision pending — Cesar/Bill evaluating)

### Who Built What
- **Cesar**: Amira platform (FastAPI, Next.js, multi-tenancy, skills, Docker, databricks-agent)
- **Ale**: UI/design system, frontend architecture
- **Rajiv**: CI module, SRS v3.1, vision/strategy
- **Farzaneh + Claude Code**: FinIQ app (10 commits, 91.3% compliance, all real Databricks)
- **Bill**: Governance workflow, A2A/MCP protocol review

### ROI Story for April 21
- Previous internal builds took 12 weeks
- FinIQ built in under 2 weeks
- Platform replicates this across business units
- "We didn't just build an app — we built a platform that builds apps"

**Why this matters:** Every future conversation about adding agents, apps, or features should reference this architecture. FinIQ is a template — new apps follow the same pattern.
