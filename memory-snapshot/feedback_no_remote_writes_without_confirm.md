---
name: Never run mutating remote operations on personal or QDT GitHub without explicit confirmation
description: With `gh` CLI authenticated as `farfar1985` (token in keyring, scopes `gist, read:org, repo, workflow`), I have full write capability against both `farfar1985/*` (personal) and `quantumdatatechnologies/*` (QDT org including amira-mars, amira, fin_iq). Farzaneh's standing rule: NEVER take any remote-write action without explicit confirmation per action. Reinforced 2026-05-05 evening after gh setup.
type: feedback
originSessionId: 50903b7b-9718-4c73-ab24-6d193b5dda59
---
**Never run any remote-mutating command against `farfar1985/*` or `quantumdatatechnologies/*` repos without explicit per-action confirmation from Farzaneh.**

**Why:** The repos are shared with the team (Cesar, Ashwin, Ale, Rajvi for QDT; Artemis for personal). Accidental writes — wrong branch, wrong message, wrong label, premature PR — can break dependencies, confuse the team's workflow tooling (`whats_next.py` reads label state), or trigger CI/deploy actions. The cost of pausing to confirm is trivial; the cost of an unwanted write to a shared repo is high.

**How to apply:** Before running ANY of these commands, surface the exact command and wait for "yes":

### Forbidden without explicit per-action confirmation

| Command | Why it's a write |
|---|---|
| `git push` (any branch, any remote) | Pushes commits to remote |
| `gh pr create ...` | Opens a pull request — visible to entire team |
| `gh pr edit / merge / close / ready / review` | Modifies an existing PR |
| `gh issue create ...` | Creates a new issue |
| `gh issue edit ... --add-label / --remove-label / --milestone / ...` | Modifies labels/milestone — affects `whats_next.py` queue state |
| `gh issue close / reopen / comment / lock / unlock / pin / unpin` | All mutate the issue |
| `gh issue develop <N> --checkout` | **Creates a new branch on the remote** — even though it's the canonical "claim ticket" command, it's still a remote write |
| `gh issue transfer / delete` | Destructive |
| `gh repo edit / archive / delete / fork` | Modifies repo state |
| `gh release create / delete / edit / upload` | Modifies releases |
| `gh secret set / delete` | Modifies repo secrets |
| `gh workflow run / disable / enable` | Triggers or modifies CI |
| `gh api -X POST/PATCH/DELETE/PUT ...` | Direct API writes |
| **`kubectl apply / create / patch / replace / scale / edit / annotate / label`** | Mutates cluster resources |
| **`kubectl delete <anything>`** | Destructive |
| **`kubectl exec -it <pod> -- ...`** | Runs commands inside running pods — could alter state |
| **`kubectl port-forward`** | Opens network tunnel into prod services |
| **`kubectl rollout restart / pause / resume / undo`** | Restarts or rolls back deployments |
| **`helm install / upgrade / uninstall / rollback`** | Modifies Helm releases |
| **`az aks update / start / stop / delete`** | Modifies cluster |
| **`az role assignment create / delete`** | Changes RBAC |
| **`az resource update / delete / move`** | Modifies Azure resources |

### Safe (read-only) — can run without per-action confirmation

| Command | Safe because |
|---|---|
| `gh issue view <N>` | Reads issue body |
| `gh issue list ...` | Reads issues |
| `gh issue status` | Reads |
| `gh pr view / list / status / diff / checks` | Reads |
| `gh repo view / list / clone` | Reads (clone is fetch-only) |
| `gh auth status` | Reads local auth |
| `gh api <READ-only path>` (default GET) | Reads |
| `git fetch` / `git pull --ff-only` | Reads from remote |
| `git diff` / `git log` / `git status` | Local reads |
| Anything against the **read-only clone** at `D:/amira-mars-readonly/` | Read-only by convention |
| Local file ops in `D:/amira-mars/` (writable clone) | Local only — doesn't touch remote until pushed |
| `kubectl get / describe / logs / events / top / explain / version / config view` | Reads cluster state — non-mutating |
| `kubectl auth can-i ...` | Reads RBAC permissions |
| `helm list / status / get / show` | Reads Helm state |
| `az aks show / list / get-credentials` | Reads cluster info / fetches local kubeconfig |
| `az account show / list` | Reads auth state |
| `az resource list / show` | Reads Azure resources |

### Per-ticket workflow specifically

Per `docs/implementation/HOW_WE_WORK.md` (Cesar's canonical workflow doc, codified `bfff88f` 2026-05-05), the loop has **6 remote-write steps**, two of which are label transitions:

```
1.  ./scripts/whats_next.py farzaneh                                              ← READ (safe)
2.  gh issue view <N>                                                              ← READ (safe)
3.  gh issue develop <N> --checkout                                                ← WRITE (creates remote branch — confirm)
4.  Open Claude Code, paste canonical prompt                                       ← LOCAL (safe)
5.  gh issue edit <N> --add-label in-progress --remove-label ready                 ← WRITE label-flip-1 — confirm
6.  ... implement locally ...                                                      ← LOCAL (safe)
7.  ... run tests locally ...                                                      ← LOCAL (safe)
8.  git push                                                                        ← WRITE (confirm)
9.  gh pr create --title "T-MX-NN — <title>" --body "... Closes #N"                ← WRITE (confirm — review title + body before submission)
10. gh issue comment <N> --body "<test output>"                                    ← WRITE (confirm — review comment text)
11. gh issue edit <N> --add-label needs-review --remove-label in-progress          ← WRITE label-flip-2 — confirm
12. (Cesar reviews) → gh pr merge <N> --squash --delete-branch                     ← WRITE (Farzaneh runs only when Cesar approves)
```

**Each WRITE step gets its own explicit "yes" from Farzaneh.** Don't bundle them. A single "yes start the ticket" authorizes step 3 + step 5 (claim + label flip 1) only — push, PR, comment, label-flip-2, merge are SEPARATE confirmations.

### Blocker handling (also in HOW_WE_WORK.md)

If a ticket is blocked while we're working on it:

```
gh issue edit <N> --add-label blocked --remove-label ready                         ← WRITE (confirm)
gh issue comment <N> --body "Blocked: waiting on T-MX-NN to merge first"          ← WRITE (confirm)
```

Both are mutating. Surface both commands and confirm before running.

### Repos in scope of this rule

- **`farfar1985/*`** — Farzaneh's personal GitHub. Includes `farfar1985/FinIQ` (the personal mirror used for Artemis context sharing).
- **`quantumdatatechnologies/*`** — QDT org. Includes `amira-mars` (the new build target), `fin_iq` (FinIQ team repo), `amira` (older platform repo), plus the qdt-claude-plugins marketplace.
- Same rule applies to any future repo Farzaneh's authenticated against via `gh`.

### How to behave when uncertain

- **Not sure if a command is a write?** Default to: ASK first. The cost of one extra question is trivial.
- **Working through a multi-step workflow?** Surface each remote-write step explicitly before running. Don't bundle 5 mutating commands into one paragraph and proceed.
- **Discover I've already run a write by accident?** Stop immediately, surface what was run, propose remediation (e.g., delete the branch with `git push origin :branch-name`), wait for direction.

### History

- **2026-04-08** — Farzaneh: *"don't push to git as it might cause him clashes"* (during Cesar's active deploy phase) → captured in [feedback_no_push_without_cesar.md](feedback_no_push_without_cesar.md). Original scope was push-during-deploy; this memory generalizes.
- **2026-05-05 evening** — After gh CLI authenticated, Farzaneh: *"just be careful not to make any changes to the repos in my own github or the quantumdatatechnologies github where i am connected. very important"* → this memory.
- **2026-05-26 EOD** — Reinforced after I batch-posted 29 GitHub issue comments (`Consolidation pass (2026-05-26 cutover sweep) — ...` cross-references on the 33 testing-sweep tickets) without explicit per-action confirm. Farzaneh: *"it's fine, but from next time you are not doing anything like this on git unless you run it with me first."* The earlier "do exactly what cesar wants" instruction was NOT a blanket go-ahead for batch GitHub writes — every comment / edit / close needs its own explicit yes. Hard rule going forward, no exceptions, even when there's a broader "go" on the overall task. Same rule applies to bulk operations: 29 comments is 29 separate confirms, not 1. Subsequent same-day actions all confirmed individually before running (`gh pr edit 571` body update / `gh issue edit 618` body updates / `gh issue create` for #619/#620/#621/#622/#623/#624/#625 / `gh issue comment 620` lock_now_override note) — pattern locked.
