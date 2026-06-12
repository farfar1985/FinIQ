---
name: Session persistence — Cesar's platform handles it
description: Cesar confirmed session/memory persistence is handled by Amira platform, not the FinIQ app
type: project
---

**Decision (2026-04-01):** Session persistence is Cesar's platform responsibility, not ours.

Cesar said: "I was handling all this in the amira platform, so I guess that would be part of that platform."

**What this means:**
- Chat history, job queue, user preferences → Amira platform handles persistence
- FinIQ app stays stateless (in-memory only) for the POC
- No need to add localStorage, Cosmos DB, or database for sessions in the app
- App will plug into Cesar's platform as a use case

**Why:** Avoids duplicate work. Cesar's platform already has multi-tenancy, agent management, and persistence built in.

**How to apply:** Don't spend time on session persistence in FinIQ. Focus on features and real data. When Cesar's platform is ready, we integrate.
