---
name: 773-build-blueprint
description: "#773 (repo-in-KB grounding) — LOCKED build blueprint, grounded in code reads 2026-06-11 night. Worktree D:/amira-mars-773 ready (branch 773-repo-kb-grounding = 767-repo-import content, which already CONTAINS 669-kb-grounding; venv installed; .env copied)."
metadata: 
  node_type: memory
  type: project
  created: 2026-06-11
  originSessionId: 865f4eec-9f0d-42a4-84f4-46f0ab7b8fca
---

## The architecture-deciding insight (verified in code)
**`fetch_kb_chunk` is attachment-type agnostic** (`elicit_turn.py::_dispatch_fetch_kb_chunk` — embeds query via `embed_query`, pgvector cosine over `kb_chunk` scoped to the spec's `indexed` attachments, returns filename+chunk text). **If the repo digest lands as a normal KB attachment, retrieval + status lifecycle + context-snapshot listing + grounding conventions ALL work with zero changes.**

Second insight: **`StaticAnalysisOutput` is fully structured** (detected_frameworks / endpoints / data_models / integrations / tests / file_index — `domain/reveng/types.py:247`) → the digest can be a **deterministic markdown renderer, NO LLM call in v1**.

## Build pieces (in commit order)
1. **`domain/reveng/digest.py`** — `render_repo_digest(analysis: StaticAnalysisOutput, *, repo_url, branch) -> str`. Pure function → aspect-organized markdown (sections: Stack & frameworks / API endpoints / Data models / Integrations & external deps / Tests / File map / key in-repo .md docs if analyze_static surfaces them). Unit tests = deterministic, no services.
2. **`runtime/activities/reveng/digest_and_attach.py`** — Activity: render digest → `blob_store.put(container=_KB_CONTAINER, key=f"{org_id}/{attachment_id}", content_type="text/markdown")` → insert `KbAttachmentRow(status=INDEXING, mime_type="text/markdown", filename=f"repo-digest-{name}.md", scope=private, uploaded_by=requested_by)` → emit `spec.kb-attachment-uploaded` outbox (mirror `mutations.py:295-380` conventions) → call existing `index_kb_attachment` (chunks+embeds, flips INDEXED) — failure path uses `mark_kb_attachment_failed` in OWN transaction (kb_indexer's documented discipline).
3. **`RepoDigestWorkflow`** (`runtime/agents/reveng/`) — mint_oauth_token → provision_sandbox → clone_repo → analyze_static → digest_and_attach → teardown_sandbox. Reuses ALL existing reveng activities; register alongside RepoImportWorkflow (same task queue / worker).
4. **Route/callback branch** — attach-repo begins via the existing OAuth dance; the begin request stores `parameters={"mode": "kb-digest", "spec_version_id": ...}` on the `ImportedSpecSessionRow` (jsonb → **NO migration**); `imports_oauth_callback` branches on mode: kb-digest → start RepoDigestWorkflow (no Project creation — the spec already exists), else current import flow. New begin route `POST /specs/{spec_version_id}/kb-attachments/repo` wrapping imports/begin semantics with the mode + spec binding.
5. **v1.txt mediation rule** — when grounding spec content from an attached REPO's chunks: surface conflicts between the source repo's assumptions and the current spec (stack, conventions, data semantics) as fitting questions BEFORE integrating (#733 block-and-ask for genuine decisions); provenance phrasing "adapted from <repo>"; never silent-paste. fetch_kb_chunk's existing cite-filename/synthesize rules already apply.
6. **Tests**: digest renderer units (deterministic) + route/callback-branch tests (mirror test_import_refine_session.py harness) + live drive: attach microblog to a prompt-path spec → ask "use the same follow-graph approach as the attached repo" → mediation question → adapted FRs.

## Conventions captured (verified)
- KB blob: container `_KB_CONTAINER`, key `{org_id}/{attachment_id}`, metadata {filename, spec_version_id, uploaded_by}.
- KbAttachmentRow fields per `mutations.py:338-351`; outbox kind `spec.kb-attachment-uploaded` (action=upload).
- `index_kb_attachment(session, blob_store, attachment_id, container)` does extract→chunk(2000/200 overlap)→embed(voyage-4-large@1024)→DELETE old chunks→insert→INDEXED→`spec.kb-indexed` outbox. `text/markdown` is in `_TEXT_MIMES` (extractable).
- Voyage key present in dev .env (verified count=1).
- OAuth state HMAC-bound to import-session id (`oauth.py generate_state/parse_state`); callback ownership checks per import_routes.

## Worktree state
`D:/amira-mars-773`, branch `773-repo-kb-grounding` (= `767-repo-import` tip `ad994aa` — already contains 669-kb-grounding's commits, "Already up to date" on merge). venv installed (`uv sync --extra dev` exit 0), .env copied. PR later: base master, body notes it contains #766+#768 commits; diff collapses when those merge (the #775 pattern — never base on a deletable branch).

## Status / next
BUILT + VERIFIED 2026-06-11 LATE NIGHT (6 commits on 773-repo-kb-grounding, worktree D:/amira-mars-773). Tests 3x green; route live with her session; analyze/digest/attach/INDEXED verified vs real services (4 chunks, both specs); agent mediation TEXTBOOK pass (cites digest, 2 fitting questions, zero silent staging). PR NOT YET OPENED - first action next session (her go). Sandbox transport untestable until laptop reboot (kind-node bytecode corruption). Full record: CLAUDE.md LATE NIGHT entry + project_next_session.md.
