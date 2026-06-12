---
name: Cesar's deploy-project Claude Code skill
description: Plugin Cesar built (qdt-claude-plugins/deploy-project) that handles end-to-end deployment for QDT projects. Installed in Farzaneh's WSL 2026-04-22, validated loading, not yet used for actual deploy.
type: reference
originSessionId: b22fb3dd-251d-4e8f-a022-7729b018094f
---
## What it is

Claude Code plugin Cesar announced on WhatsApp 2026-04-22. Walks a QDT teammate (engineer or not) through deploying a project to a specific environment. Handles pre-checks, sync, commit + push, build/release pipeline monitoring, approval-gate detection, and kubectl verification.

- **Marketplace**: `github.com/quantumdatatechnologies/qdt-claude-plugins`
- **Plugin name**: `deploy-project@qdt-claude-plugins`
- **v0.1.0 release**: https://github.com/quantumdatatechnologies/qdt-claude-plugins/releases/tag/v0.1.0
- **v0.1.1 update**: acronym support (QC, KQ, QDL, QAI, PSI), fewer confirmation questions on clean deploys

## Projects + targets covered

| Project | Targets |
|---|---|
| **FinIQ** (fin_iq) | Mars dev, QDT internal Azure (`finiq-app.azurewebsites.net`) |
| **Quantum AI** (noname) | Quantum AI (`superforecast.ai`), Mars (`superforecast.cloud-effem.com/noname`) |
| **Quantum ML** (quantum_ml) | QDT (`quantumcloud.ai`), Mars (KQ — `superforecast.cloud-effem.com`) |
| **Quantum PSI** (master-psi branch) | Mars (`/psi-dash` sibling) |
| **Quantum Datalake** | `qdl.ai` |

Forces target disambiguation — "deploy to production" never silently routes to the wrong cluster.

## How it triggers

Natural language only — NO slash command. The skill auto-triggers on deploy/ship/release/rollout/promote language.

Examples:
- *"Deploy fin_iq to Mars dev"*
- *"Push the latest fin_iq to our Azure environment"*
- *"Ship quantum_ml to QuantumCloud"*
- *"Is the release waiting for approval?"*
- *"Check if the PSI deploy finished"*

## What it does on a clean deploy

Per Cesar's docs, v0.1.1 minimizes interruptions:
1. **Finds local clones** of source + target repos (no path typing)
2. **Scans synced code** for new env var references; flags any not wired into `values.yaml` + DevOps secrets library + release-pipeline set-values box
3. **Syncs source → target repo** (file-by-file, filtered to what the target needs)
4. **One confirmation** before sync
5. **One confirmation** before commit+push
6. **Monitors build pipeline**, detects release auto-start, recognizes approval gate, waits for human (Farzaneh or Ale) approval
7. **After helm upgrade**, runs pod-state + image-tag + Secret-placeholder + health-endpoint checks

## Prerequisites

1. `git clone` of private QDT repo must work from terminal (SSH or HTTPS+PAT).
2. Claude Code CLI up to date (`claude update`).
3. **On Windows: MUST run in WSL** (not native cmd/PowerShell/Git Bash). The skill uses `rsync` + bash-native tools. Native Windows Claude Code also has a separate bug where paths like `~/.claude/...` get mangled to `~/aclaude/...` (dot stripped).
4. Tools needed locally: `git`, `rsync`, `az` CLI, `kubectl`, `docker`. First AKS use prompts to install `az extension add --name azure-devops`.
5. (Recommended) `GITHUB_TOKEN` env var for marketplace auto-updates.

## Install steps (done 2026-04-22 in Farzaneh's WSL)

```bash
# In Ubuntu WSL (after `conda deactivate` if base env was active — Claude Code segfaults otherwise)
claude   # launches CLI v2.1.29

# Inside CLI (type commands ONE AT A TIME, pressing Enter between each):
/login  # complete auth flow — "Opus 4.5 · Claude Team · QDT MAX ANTHROPIC TEAM" on success
/plugin marketplace add quantumdatatechnologies/qdt-claude-plugins
# → "Successfully added marketplace: qdt-claude-plugins"

/plugin  # opens interactive menu
# - Discover tab: find deploy-project, press Enter for details, select "Install for you (user scope)", press Enter
# - Watch for "All available plugins are already installed" = done
# - Esc to exit

/plugin update deploy-project@qdt-claude-plugins  # get v0.1.1 features
```

**Warnings expected during install** about Anthropic's official `claude-plugins-official` marketplace having invalid schema — those are unrelated and harmless.

## Validation (what "skill is loaded" looks like)

Natural-language test:

```
what projects can you deploy?
```

Expected response (from 2026-04-22):

```
● Skill(deploy-project)
  └── Successfully loaded skill

Based on the skill documentation, I can deploy the following QDT projects:
1. FinIQ - Next.js + voice server
2. Quantum AI (also called "noname service")
3. Quantum ML - Flask + Dash + workers
4. Quantum PSI - Mars-only sibling of Quantum ML (uses master-psi branch)
5. Quantum Datalake - qdl.ai (Flask + 30+ ingestion deployments)
...
Common shorthand you can use:
- QC - QuantumCloud
- KQ - QuantumKnowledge
- QDL - QuantumDatalake
- QAI - Quantum AI
- PSI - Quantum PSI
...
Which project would you like to deploy?
```

If you see `Skill(deploy-project) ✓ Successfully loaded skill` — it's working.

## What's NOT been tried yet (Farzaneh's WSL install)

As of end-of-session 2026-04-22: plugin installed + validated loading. **Actual deploy has NOT been attempted from Farzaneh's install.** Farzaneh explicitly said "*just see if anything works but dont deploy, if everything works then we ask cesar and we deploy*."

Reserved for a future session: invoke `deploy fin_iq to our Azure environment`, stop at the first approval gate, verify the skill's proposed actions before pushing.

## Gotchas learned in install (2026-04-22)

1. `/plugin` commands only work in **Claude Code CLI terminal** — not the desktop app / IDE chat. First attempt in Cursor/VS Code Claude Code failed with "/plugin isn't a recognized command here."
2. On Windows native Claude Code CLI, `.claude` directory path gets mangled (e.g., `C:\Users\farza\.claude` becomes `C:\Users\farzaclaude`). **Use WSL.**
3. With conda `(base)` env active in WSL, `claude` command segfaults on launch (native binding loaded against wrong libc). Fix: `conda deactivate` before launching Claude Code.
4. Pasting multiple `/plugin` commands at once can concatenate them into a single submission. **Type one at a time, press Enter between each.**
5. The install flow from `/plugin` menu goes Discover → Enter → Details → "Install for you (user scope)" → Enter. "(no content)" output after install is actually a silent success — check Discover tab status ("All available plugins are already installed") to confirm.

## Tested paths per Cesar (as of v0.1.0 announcement)

- **Fully end-to-end tested**: `Quantum ML → QuantumCloud` only
- Other paths (incl. FinIQ → Mars, FinIQ → QDT Azure) are written from deployment memory but **not exercised against real infra**. Cesar explicitly asked: *"if you try a path I haven't exercised (anything other than quantum_ml → QuantumCloud), let me know what breaks."*

So if/when Farzaneh runs the FinIQ path, expect possible rough edges. Report to Cesar if so.

## Scope of skill

This plugin handles deployment ONLY. Not development, not code review, not compliance. Single-purpose, tight scope — matches Cesar's wider "component-per-agent" framing (Spec Agent / Coding Agent / Deployment Agent are separate concerns).
