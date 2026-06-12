# #669 — KB grounding for the Spec Agent: design brainstorm

Same flow as #729 / #756: ground-truth study → options + recommendation → Cesar's lock → build. Ticket: [#669](https://github.com/quantumdatatechnologies/amira-mars/issues/669). Cross-links: #726 (capability roadmap — names #669 "highest value-per-effort"), #725 (handoff), T-M3-06 / #99 (the indexing half, shipped).

---

## 1. The headline

**This is the planned follow-up to work Cesar already shipped — his own PR said so.** PR #455 (T-M3-06, merged 2026-05-23) body, verbatim:

> "The retrieval side (the `fetch_kb_chunk` tool for the agent) is explicitly not included in this PR. **That work follows in a separate ticket (#669)** once the indexing pipeline stabilizes in production."

The pipeline has been stable since 5/23. Every uploaded doc is already extracted, chunked (~2000 chars, sentence-aware), embedded (Voyage `voyage-4-large` @ 1024d — the EMBED-1 platform lock), and persisted to `kb_chunk` with a real pgvector column. **`kb_chunk` is write-only today — zero reads anywhere in the codebase.** The platform pays for embeddings nobody ever queries; users see a KB tab that accepts files and silently does nothing (Rajiv hit this live with his architecture docx).

**Zero migrations needed.** The entire feature is read-side: one tool, one query, one context-block section, prompt teaching, tests.

## 2. Ground truth (current master, all verified)

- **Tables**: `kb_attachment` (filename, mime, blob_key, `spec_version_id` FK, scope private/team, status indexing/indexed/error, indexed_chunks) + `kb_chunk` (FK, chunk_seq, text, `embedding Vector(1024) NOT NULL`, page_or_offset, org_id for RLS). HNSW/IVFFlat index explicitly "deferred to query-tuning ticket" by the migration docstring — exact scan is fine at one-spec scale (tens–hundreds of chunks).
- **Indexer** (`domain/spec/kb_indexer.py`): PDF/DOCX/TXT/MD/CSV ≤50MiB; Voyage batched ≤128, `input_type="document"`, dim-validated; Temporal one-shot workflow per upload, retry discipline. **EMBED-1 lock from PR #455: "future embedding consumers MUST call through `kb_indexer.embed_chunks` (or future `embed_query` sibling for query-side calls)"** — the query-side embed has a designated home and name already.
- **Agent surface**: `SpecContext` has NO KB field; `_render_context_block` (post-#757) renders spec doc / graph snapshot / gaps / DPs / chat tail — a KB section slots naturally after the spec doc. Tool dispatch: new read-only tool follows the `lookup_skill` precedent exactly (async dispatcher + AsyncSession → markdown string; `is_error` discipline; input model in `TOOL_INPUT_MODELS`). Budgets: 12,000 out-tokens/turn, 12-iteration ReAct cap → a chunk ≈ 500 tokens, k=5 ≈ 2,500 tokens — fits comfortably.
- **Prompt**: v1.txt teaches tools in "## Tool surface" (read-only subsection) + behavioral rules in "## Conventions". KB/attachments are mentioned nowhere today.
- **Search precedent**: `lookup_skill` is ILIKE; there is **no vector-similarity query anywhere yet** — `fetch_kb_chunk` would be the platform's first, against infrastructure built for exactly this.

## 3. D1 — Retrieval tool shape

- **A (recommended): `fetch_kb_chunk(query: str, k: int = 5, le=10)` — semantic search.** Embed the query via a NEW `embed_query()` sibling in `kb_indexer.py` (`input_type="query"`, same model/dim — EMBED-1-compliant, no second endpoint), then pgvector cosine (`embedding <=> :qvec`) over `kb_chunk JOIN kb_attachment WHERE spec_version_id = ctx AND status='indexed'`, RLS handles org. Returns top-k as markdown: `filename · chunk N (page/offset) · similarity` + text. This is the shape #669's fix sketch proposed AND the name the tools.py deferral comment + plan/07 reserved.
- **B: fetch-by-id/sequence** (agent lists chunks, requests specific ones) — no query-side embedding needed, but the agent can't know which of 47 chunks holds the answer; useless for needle-finding. Reject.
- **C: auto-injection** (no tool — system embeds each user instruction and injects top-k chunks every turn) — zero prompt teaching, but burns tokens on every turn whether relevant or not, adds noise to non-KB turns, and removes the agent's ability to run multiple targeted searches in one turn. Possible future *addition*, wrong v1. Reject for now.

## 4. D2 — Awareness (how the agent knows files exist)

Extend `SpecContext` with `kb_attachments: list[KbAttachmentSummary]` (filename, status, indexed_chunks) — read by `assemble_spec_context` from `kb_attachment` by spec_version_id — and render a `## Attached knowledge-base files` section in the context block (same move as #757's graph snapshot). Include non-indexed files WITH their status so the agent can honestly tell the user "your file failed to index" instead of silently ignoring it. Without this, the tool exists but the agent never knows there's anything to search — the #757 lesson (the agent asserts about state it can't see) applied preemptively.

## 5. D3 — Prompt + evaluator

- **v1.txt**: new read-only tool entry in "## Tool surface" + one Conventions rule: *before asking the user a question an attached document could answer, search the KB first; ground proposals in retrieved content and cite the filename; synthesize — never paste chunks verbatim into requirement text.* This directly shortens the interview (the #728 interviewer asks for data models/domain content — exactly what attachments hold).
- **Evaluator**: per the two-sided-calibration lock a grounding criterion belongs with the behavior change — but per the #758 lesson (static rubric paragraphs make the judge globally stricter), it must be **conditionally injected only when the session has indexed attachments** (the evaluator input already carries what we need to gate on). Cheap, calibration-neutral. Alternative: defer the evaluator change entirely to keep the PR tighter — flagged as a lock question.

## 6. D4 — Scoping + performance

- **Retrieval scope v1**: all `indexed` attachments on the session's spec_version. (The UI currently hardcodes `scope="private"` on upload and the uploader is the session user in practice, so private-vs-team retrieval filtering is theoretical today — proposal: defer scope filtering until team-scope uploads exist in the UI; flag as lock question.)
- **No vector index**: exact scan at one-spec scale; the HNSW index stays deferred per the existing migration note (re-visit when org-wide KB search exists).
- **Latency**: one Voyage query-embed round-trip per tool call (~100–300ms) inside a turn — negligible against LLM latency. Voyage failure → `is_error=True` tool result (the agent says it couldn't search), not a turn crash.

## 7. Two side-bugs found during the study (verified, to file separately)

1. **`KbAttachmentStatus.INDEX_FAILED` doesn't exist** — `kb_indexer.py:390` (`_flip_to_failed`) assigns `KbAttachmentStatus.INDEX_FAILED`, but the enum defines only `INDEXING/INDEXED/ERROR` → on any indexing failure the failure-handler itself raises AttributeError and the attachment is stuck at "indexing" forever. One-line fix (`.ERROR`) + a failure-path test.
2. **Upload picker / backend MIME mismatch** — frontend `accept=".pdf,.docx,.xlsx,.csv,.md,.json,.txt"` but `_ALLOWED_MIME_TYPES` has no xlsx/json → picking those files guarantees a 400. Fix either side (align picker, or add extract support).

## 8. Build scope (once locked)

| Piece | Work |
|---|---|
| `kb_indexer.py` | `embed_query()` sibling (EMBED-1-compliant) |
| `tools.py` | `FetchKbChunkInput` + ToolDef (read-only), registered in `TOOL_INPUT_MODELS` |
| `elicit_turn.py` | async dispatcher (lookup_skill pattern: session → pgvector query → markdown) + `## Attached knowledge-base files` context section |
| `turn_types.py` + `assemble_spec_context` | `KbAttachmentSummary` + `SpecContext.kb_attachments` + read |
| `v1.txt` (+ evaluator if locked) | tool teaching + grounding convention (+ conditional rubric) |
| Tests | real-Postgres+Voyage retrieval round-trip (index a fixture doc → search → top-k sane) + real-Opus grounding turn (attachment in context → agent searches → cites filename) + tool-error path |

**Estimate: ~1.5–2 days.** Zero migrations, zero new deps (voyageai + pgvector already runtime deps), backend-only (KB tab UI already exists).

**Prerequisite**: `VOYAGE_API_KEY` for local dev/testing (cluster has it — indexing works deployed; we need it locally for the real-services verification gate).

## 9. Lock questions for Cesar

1. **D1**: semantic-search `fetch_kb_chunk(query, k)` per the #669 sketch + PR #455's `embed_query` plan — OK? Keep the reserved name `fetch_kb_chunk`?
2. **D2**: `SpecContext.kb_attachments` + context-block listing (incl. failed/indexing files with status) — OK?
3. **D3**: evaluator grounding criterion conditionally-injected (only when attachments exist), or defer the evaluator change entirely?
4. **D4**: v1 retrieval scope = all indexed attachments on the spec_version (defer private/team filtering until team uploads exist) — OK?
5. **Side-bugs**: file the INDEX_FAILED crash + MIME-mismatch as separate bug tickets (the enum one we could fix in the same PR if you prefer — it's 1 line + a test)?
6. **Dev `VOYAGE_API_KEY`**: can you share one for local verification, or should tests target the dev cluster differently?
