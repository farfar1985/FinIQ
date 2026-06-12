---
name: GitHub auto-closes stacked PRs when base branch is deleted
description: When you `gh pr merge --delete-branch` on a parent branch, GitHub auto-closes any open PRs targeting that branch. Closed PRs cannot be reopened OR re-targeted to a different base. Pattern: rebase locally + force-push + open fresh PR.
type: feedback
originSessionId: 50903b7b-9718-4c73-ab24-6d193b5dda59
---
When merging a PR with `--delete-branch`, every open PR targeting that deleted branch auto-closes. Don't try to reopen — GitHub refuses base-edit on closed PRs.

**Why:** Hit this 2026-05-06 afternoon during the 7-PR merge batch. Merged PR #236 (T-M2-23) with `gh pr merge 236 --squash --delete-branch`. PRs #238 (T-M2-24) and #239 (T-M2-25) were stacked on `86-t-m2-23-llm-adapter-facade` as base. Both immediately flipped to CLOSED status. Tried `gh pr edit 238 --base master` + `gh pr reopen 238` → both errored with `GraphQL: Cannot change the base branch of a closed pull request` and `Could not open the pull request`.

**How to apply:**
- **Prevention**: don't stack PRs unless absolutely necessary. Each new ticket should start off master. If you must stack, merge the parent first ALONE (no `--delete-branch` if children are still open), let GitHub auto-rebase the children to master, THEN merge children, THEN delete branches.
- **Recovery when this happens**: the source branch still exists on origin (only the parent's branch was deleted, not the child's). Pattern:
  1. `git checkout master && git pull --ff-only origin master` (sync local master)
  2. `git checkout <child-branch> && git reset --hard origin/<child-branch>`
  3. `git rebase master` — this will conflict on the parent's original commit (master has the squash version of it). Use `git rebase --skip` to drop that commit; the child's actual changes replay cleanly on top.
  4. May also conflict on `pyproject.toml` / `uv.lock` (see `feedback_uv_lock_conflict_strategy.md`)
  5. Run tests to confirm green post-rebase
  6. `git push --force-with-lease origin <child-branch>`
  7. `gh pr create --base master --head <child-branch> --title "...(re-opened after #<orig> base-deletion auto-close)" --body-file <body>` — write a fresh body referencing original PR + `Closes #<orig-issue>`
  8. Merge fresh PR

**Recovery cost**: about 5 minutes per orphaned PR. Cleaner than fighting GitHub's reopen restriction.
