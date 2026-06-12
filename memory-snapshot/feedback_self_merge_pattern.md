---
name: Self-merge pattern in amira-mars repo
description: Cesar's directive (2026-05-06) — ship → push → PR → self-merge with --squash --delete-branch immediately. No review-gate before merge; review batch happens at phase boundaries. Each ticket starts off master.
type: feedback
originSessionId: 50903b7b-9718-4c73-ab24-6d193b5dda59
---
Self-merge our PRs into master immediately after opening them; do not queue for Cesar review.

**Why:** Cesar's WhatsApp 2026-05-06 ~11:55 AM (FinIQ GenAI group): *"@Farzaneh when you are done with these make sure to close them and merge them right away into master. otherwise youl will be working off master and each of these tips will have a different version of the same feature."* Asked if he wanted to review first; he said *"not for now, we'll do a round of reviews after phases completion."* Reviews are batched at phase boundaries (post-M2 batch / post-M3 batch), not per-PR.

**How to apply:**
- Canonical command: `gh pr merge <PRNUMBER> --squash --delete-branch`
- Sequence: build → test → push → `gh pr create --base master` → `gh pr merge <num> --squash --delete-branch` → start next ticket OFF master (NOT stacked off the just-merged branch).
- This is an explicit Cesar-authorized remote-write but still subject to the per-action confirmation rule in `feedback_no_remote_writes_without_confirm.md` — Farzaneh confirms before each merge.
- DO NOT stack new tickets off in-flight branches. Each ticket starts from a fresh master pull. Stacking caused #238 + #239 to auto-close on 2026-05-06 when their base branch was `--delete-branch`'d (see `feedback_pr_base_deletion_autocloses.md`).
- Conflict on merge → diagnose locally, rebase, force-push, retry. Don't push through with `--admin` or any bypass.

**When this changes:** if Cesar later asks for review-before-merge again (e.g., on cross-cutting tickets touching shared infrastructure), revert to ship-PR-and-wait. Default after 2026-05-06 is self-merge.
