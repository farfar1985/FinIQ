---
name: cesar-bug-issue-and-bug-pr-templates
description: "2026-05-26 banked after filing 3 bugs matching Cesar's pattern. Canonical\ntemplates for: (1) bug-report issues — based on his #592-#596 series filed\nthe night before, (2) bug-fix PRs — based on his #587 and #591 merge entries.\nUse these for ALL bug filings going forward; deviation should be a conscious\nchoice with a stated reason.\n"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 865f4eec-9f0d-42a4-84f4-46f0ab7b8fca
---

## Cesar's bug-report ISSUE template (use this exact shape)

Source: Cesar's #592, #593, #594, #595, #596 (all filed 2026-05-26 overnight).
Across all 5 issues, his structure is consistent:

```markdown
## Repro

1. Numbered steps
2. Each step actionable
3. Last step is "expected output" or "where the gap surfaces"

## Expected

What should happen — 1-2 paragraphs. May open with "(Brainstorm-question — ...)"
if the bug is design-ambiguous rather than mechanical.

## Actual

What actually happens — error trace, output mismatch, etc. Quote the EXACT
error message or symptom; don't paraphrase.

## Why it matters

1-2 paragraphs on user-facing impact + scope of breakage. Skipped if obvious
from Repro/Actual.

## Fix sketch (not the locked plan — brainstorm during the work)

OR for complex bugs:

## Decisions to lock during brainstorm

1. Option A — pros/cons
2. Option B — pros/cons
3. Option C — pros/cons
4. Recommendation: option X

Always marked as "(not the locked plan — brainstorm during the work)" or
similar — Cesar does NOT commit to a fix in the issue body; the brainstorm
happens during the work itself.

## Related

- #N (cross-reference to related issue) — brief reason
- `feedback_<name>.md` (cross-reference to banked memory) — brief reason

## References

- File: `path/to/file.py:line` (where the bug lives)
- Live: `https://amira.qdt.ai/path` (if user-facing)
- Discovered: `<who/when>` (context for follow-up questioning)
```

## Title format

`[bug] <imperative description>`

Examples from Cesar's actual issues:
- `[bug] /pending-approval has no sign-out — user must open incognito to switch accounts` (#592)
- `[bug] Sign-up flow accepts any Google account — should reject non-allowlisted emails at the JIT branch` (#593)
- `[bug] Architectural: session factory should refuse to yield without tenant-context (prevent recurring RLS-GUC bugs)` (#594)
- `[bug] Active sessions persist when operator reverts a user's Org to PENDING — should be auto-revoked + bounce on next request` (#595)
- `[bug] AMIRA_PLATFORM_ADMIN_EMAILS allowlist is exact-match — same person with two emails (work + personal) creates two orphan Orgs` (#596)

Pattern: `[bug]` prefix even though the `bug` label is also applied — makes it
scannable in issue lists.

## Labels (apply ALL three)

- `bug` — universal
- `track:<area>` — `track:ai-agent` / `track:backend` / `track:frontend` (where the FIX lives)
- `owner:<person>` — best guess; Cesar may reassign during consolidation

## Cesar's bug-fix PR-body template (use this exact shape)

Source: Cesar's PR #587 + PR #591 (recent bug-fix merges to master).

**Body is short — 1-3 sentences** pointing at the commit body for substance.
Examples:

#587 body (FULL):
> *"Five live issues surfaced during testing at amira.qdt.ai with Cesar driving — landed as PR-of-the-evening. See commit body for details."*

#591 body (FULL):
> *"Fourth instance of the RLS-context-missing bug (now FIXED at the canonical emit() seam). Spec Agent was hanging because the worker's text-chunk audit emit hit the with_check policy without GUC set. See commit body for the systemic vs whack-a-mole rationale."*

Note: Cesar puts the DETAILED diagnosis in the **commit message**, not the
PR body. PR body's job is to set scene + point at commit.

For bug-fix PRs, suggested body shape:

```markdown
Closes #<issue>.

<one-sentence summary of what was wrong + one-sentence how the fix works>.

<one-sentence verification or "see commit body for full diagnostic chain">.
```

Example (B1's PR #598):
> *"Closes #597. AuditActor.__init__ was missing required service_id in emit_spec_audit — every Spec Agent workflow's first turn crashed post-LLM-call with a TypeError; UI stuck on '…'. One-line fix: pass _SERVICE_ID to the actor's service_id field. Verified live: fix unblocks the elicit_turn activity, ticket 10 evaluator fires end-to-end, gaps + decision points + capability graph rows land in DB. See commit body + issue #597 for the full diagnostic chain."*

## Commit message template for bug fixes

```
[bug] <short title — matches the issue title minus "[bug]" prefix>

Closes #<issue>

<paragraph 1: what was broken + symptom>

<paragraph 2 (optional): root cause analysis>

<paragraph 3 (optional): verification — what proves the fix works>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## What NOT to do (lessons from today)

1. **Don't put a "Status" callout at the top of the issue body by default.**
   Cesar's pattern doesn't have one. Exception: if the bug is likely already
   fixed by an in-flight PR, a `> Status — likely fixed by #N` callout is
   acceptable and serves the consolidation step. We used this on B2's #599.

2. **Don't open a PR before filing the issue.** The flow is: issue first,
   then `gh issue develop --checkout` to create the linked branch (which
   sets up the auto-close-on-merge link), THEN commit + push + PR.

3. **Don't bundle multiple bugs into one issue.** Even bugs in the same lane
   get their own tracking ticket. Cesar's #592-596 are 5 separate issues
   even though several share an underlying theme (RLS, sign-up, sessions).

4. **Don't preemptively open a PR for bugs in someone else's lane.** If the
   `owner:` label points to Cesar (e.g., frontend bugs), file the issue and
   leave the PR for him. Per pre-split-tickets check first lesson.

5. **Don't bypass the consolidation step.** When Cesar says "consolidate
   first before working on them", file issues + WAIT for owner assignment.
   Don't queue more PRs against bugs not yet assigned.

## Banked

2026-05-26 PM — Farzaneh's session filing B1/B2/B3. B1 (#597+#598) deviated
from the wait-for-consolidation rule because it landed BEFORE Cesar's
consolidation directive that morning. B2 (#599) + B3 (#600) followed the
no-PR-until-consolidation pattern cleanly.

Use this template for ALL bug filings going forward. If you deviate, state
the reason explicitly in the issue or PR body.
