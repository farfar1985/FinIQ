---
name: pre-flight-lock-acknowledgement-required
description: "When Cesar issues a directive that says 'reply with X before the first code edit' (typically the list of project locks that informed our rework decisions), that is a HARD PRE-FLIGHT GATE. Read every cited file. Send the ACK. Only then code. Skipping the read = silent drift back into the same patterns that got rejected."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0973fe7c-3e3a-47eb-a295-6a31f61d994f
---

# Rule

When Cesar provides a directive that includes phrases like:

- *"Acknowledge that you've read `docs/team-locks/` (every file) + the cited `CLAUDE.md` sections, then rework."*
- *"Reply with the list of locks that touched your rework decisions before the first code edit."*
- *"Read X before writing any code."*

…that is a **hard pre-flight gate**. The order is:

1. Pull master + rebase the working branch.
2. Read every cited file (every team-lock file, every CLAUDE.md section he named).
3. Draft a WhatsApp / PR-comment / message back to Cesar with the requested artifact — typically *"the locks that touched our rework decisions."*
4. Send the ACK.
5. **Only then** open an editor.

Do NOT compress the gate. Do NOT skim. Do NOT start coding while reading.

# Why this rule exists

After Cesar rejected PR #337 (T-M3-42) at 2026-05-19 12:08 PM, his rework directive contained the explicit pre-flight gate:

> *"Acknowledge that you've read `docs/team-locks/` (every file) + the cited `CLAUDE.md` sections, then rework. Reply with the list of locks that touched your rework decisions before the first code edit."*

The gate's purpose is twofold:

1. **Force a real read** of the 22 lock files + cited CLAUDE.md sections. The cost of skimming is silent drift later — the same kind of drift that caused #337 to ship with LocalSandbox + skip-scaffolded tests + "Windows asyncio" verification claims.
2. **Confirm read via ACK** so Cesar knows we've absorbed the rules before we commit code that might violate them. The ACK content (list of locks that touched decisions) demonstrates we actually understood the rules, not just opened the files.

If we skip the gate and dive straight into code, we will likely re-ship variants of the same violations — LocalSandbox-equivalents, skip-scaffold-equivalents, verification-handwave-equivalents — because the patterns are familiar and the rules are new. The pre-flight gate is the discipline that prevents drift.

# How to apply

## When you receive a Cesar directive

Scan for pre-flight phrases:

- *"acknowledge / reply / confirm BEFORE the first code edit"*
- *"read X before writing code"*
- *"first send me the list / plan / locks / decisions"*
- *"do this in two phases — read, then code"*

If any of these appear, the pre-flight gate is active.

## Execute the gate in order

1. **Pull** — `git pull --ff-only origin master` in writable + readonly clones.
2. **Rebase** (if on a branch) — `git rebase master`.
3. **Read** — every file Cesar cited, in order. Use Read tool, not Glob/Grep. Take notes.
4. **Draft the ACK** — list of locks + how each one touched a rework decision. Format example:
   - *"Applied `feedback_no_carveouts_pull_until_complete.md` → delete LocalSandbox, pull #94 into this PR."*
   - *"Applied `feedback_no_real_behaviour_nothing_moves.md` → ship AKV harness inline, delete 3 skip-scaffolded tests, run `make test` 3× on Linux dev VM."*
   - *"Applied `feedback_fix_foundation_dont_defer.md` → sweep stale paths in plan/07 + TEP in same PR."*
5. **Send the ACK to Cesar** — typically WhatsApp message. Concise, complete, no preamble.
6. **Wait for confirmation** (or proceed if directive says proceed after ACK).
7. **Only then** start the rework.

## How to write the ACK

- Don't paraphrase the locks. Name them by filename.
- Don't summarize what the lock says (Cesar wrote it, he knows). Say what DECISION the lock pushed us to make.
- Don't bundle. One bullet per (lock → decision) pair.
- End with "proceeding now" or "waiting for greenlight" depending on his phrasing.

## What NOT to do

- Don't open files for editing while you're "in the middle of" reading the locks.
- Don't draft the ACK and start coding before sending it.
- Don't summarize multiple locks under one bullet ("applied the test rules" hides which test rule).
- Don't claim "we already follow these" without showing the specific decision the lock changed.

# Specific case — 2026-05-19 PR #337 rework

| Cesar's pre-flight requirement | What we do |
|---|---|
| Read `docs/team-locks/README.md` | Read in full |
| Read every `feedback_*.md` in `docs/team-locks/` | Read all 22 files |
| Read CLAUDE.md "Full-reality tests or no test" | Re-read; carry into rework |
| Read CLAUDE.md "Single-table outbox" | Re-read; verify no per-service outbox tables introduced |
| Read CLAUDE.md "Not in v1" | Re-read; verify no banned features re-emerged |
| Read CLAUDE.md "Master must stay green" | Re-read; this is the verification gate context |
| Reply with locks that touched decisions BEFORE first code edit | Compose WhatsApp ACK, send, wait/proceed per his cue |

# Sibling locks

- `feedback_local_clone_freshness.md` — always `git fetch + git pull --ff-only` before any read or planning step (this rule's prerequisite).
- `feedback_cesar_quality_bar_m1_backend.md` rules #3 (second-pass evaluation) and #5 (adversarial review pre-push) — both lean on reading the right material before coding.
- `feedback_no_remote_writes_without_confirm.md` — the ACK message itself is a remote write; per-action confirmation from Farzaneh still applies for that send.

# Aphorism

*"When Cesar says 'read first,' the read IS the work. Coding starts after."*
