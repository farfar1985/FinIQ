---
name: No git push without confirming with Cesar
description: When Cesar is deploying, never push to git without his explicit confirmation
type: feedback
---

Never push to git when Cesar is actively deploying. Always confirm with him first.

**Why:** Cesar deploys from the repo. Pushing during deployment can cause clashes or break the live app. On 2026-04-08, Farzaneh explicitly said "don't push to git as it might cause him clashes."

**How to apply:** Build and test locally. When ready to push, suggest a feature branch (e.g., `qml-macro`) and wait for Cesar's OK before pushing. Never push directly to `main` during active deployment.
