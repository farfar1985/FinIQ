---
name: QML API doc and key are confidential
description: Never share QML API documentation or key in code comments, CLAUDE.md, git, or any shared location
type: feedback
---

QML API documentation and API key must never be shared anywhere — not in code comments, CLAUDE.md, git commits, or any external system.

**Why:** The API doc (`Quantum ML_API Documentation_Mars_March, 2026.pdf`) and QML_API_KEY are QDT-internal. Farzaneh explicitly stated "no sharing of the document or the API keys."

**How to apply:** Store key in `.env` only (never committed). Reference the API by behavior in code, not by doc content. Memory files can note the API exists and how it works, but not the actual key value.
