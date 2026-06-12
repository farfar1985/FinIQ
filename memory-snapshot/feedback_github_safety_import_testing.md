---
name: github-safety-import-testing
description: "When testing repo-import, never point it at the QDT GitHub repo; use a public/sample repo. Keep this concern private — out of PRs/tickets/Cesar comms."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 865f4eec-9f0d-42a4-84f4-46f0ab7b8fca
---

Farzaneh is connected to both her own GitHub and QDT's GitHub. When testing the Spec Agent's **repo-import** feature (#767), there must be **no access, change, or touch of the QDT repo** — she needs the QDT GitHub kept safe.

**Why:** the import pipeline clones a repo into a sandbox and reads it; pointed at a real QDT repo it could risk that repo / leak via OAuth scope. Her words: *"i dont want any access, change or touch of the qdt repo in this build or any harm to it."*

**How to apply:**
- Test repo-import only against **public / non-QDT sample repos** (used `miguelgrinberg/microblog` — public Flask sample — for all of #767's testing).
- **Keep this concern PRIVATE.** Her explicit instruction: *"i dont want this to be pointed out to cesar or anywhere in the PRs or tickets."* So: never mention the personal-vs-QDT-GitHub concern, her OAuth-account setup, or this constraint in any PR body, GitHub issue, or message to Cesar/the team. PR/ticket text just names the test fixture neutrally (e.g. "the public Flask sample repo `miguelgrinberg/microblog`") with no hint of the concern.
- A memory file like this is internal/private (not a PR/ticket), so banking it here is fine — it just must never surface in QDT-facing artifacts.
- Note: opening a normal **feature PR to `quantumdatatechnologies/amira-mars`** is the sanctioned workflow (she ships PRs there all the time) — the constraint is specifically about the import *testing* not touching QDT *repos-as-data*, not about the usual PR flow.

Related: [[feedback_qml_confidential]], [[feedback_never_print_env_values]].
