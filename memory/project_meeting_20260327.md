---
name: Meeting decisions 2026-03-27
description: Key decisions from Mars x QDT daily sync call
type: project
---

## 2026-03-27 Call Key Decisions

### Infrastructure
- Resource group `EAA-CORPAIML-SANDBOX-EUS2-DEV-RG` set up — everyone has access
- Unity Catalog: `corporate_finance_analytics_prod` (production!)
- VM being provisioned today for code deployment
- Matt approved Databricks access
- Mars communicates via Teams/effem chat

### Process — Compliance Matrix Loop
Rajiv proposed standard enterprise workflow:
1. Spec creation agent → walks user through requirements
2. Human governance approval
3. Coding agent builds app
4. Compliance matrix agent auto-generates test criteria from SRS
5. Coding agent iterates until compliance score maximized
6. Human approval of final output
7. Deployment with approval

### Fresh Start Decision
- Next iteration builds from CLEAN SLATE with combined requirements
- SRS v3.1 coming (Rajiv adding competitive analysis)
- Stylistic guidelines v1.0 coming (Alessandro/Rajiv)
- Both docs fed together to coding agent

### Action Items
- Cesar: Construct iterative compliance matrix prompt + platform artifacts
- Rajiv: SRS v3.1 + stylistic guidelines v1.0
- Alessandro: Stylistic guidelines in required format
- Farzaneh: Format the stylistic guidelines document
- Goal: Everyone uses Cesar's platform once ready
