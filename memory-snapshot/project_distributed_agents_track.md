---
name: distributed-agents-track-proposal
description: Rajiv's proposal (2026-05-04) for distributed/remote coding agents as parallel architecture to Cesar's locked Mars cloud platform. Status, motivations, concerns, three coexistence options, and recommended A+C path. Discussion continues 2026-05-05.
type: project
originSessionId: 3e083471-f31f-4be5-b559-fbffb01f73fb
---
# Distributed Agents — Parallel Track Proposal (Rajiv, 2026-05-04)

**Status**: EXPLORATORY. Mars deployment locked on cloud architecture (Cesar's spec, see `project_amira_architecture_canonical.md`). This track is a SECOND idea Rajiv wants explored alongside, not instead of, the Mars architecture. Cesar agreed to "think about the communication layer needed for running agents remotely" separately. No commitment to build, no timeline, no resource allocation. Discussion continues 2026-05-05.

## What Rajiv proposed

Run coding jobs on **remote machines** (developer laptops, leased VMs, customer-side compute) instead of in cloud-resident sandboxed pods. The Amira UI submits a job; a remote process picks it up, executes the work, returns results.

Two communication mechanisms surfaced on the call:

1. **Cesar's framing**: a markdown file dropped to a remote location that, upon landing, triggers the remote agent to perform the task.
2. **Rajiv's framing (preferred)**: "email-style" — Amira sends the remote agent the spec, GitHub credentials, and all required artifacts; agent codes; pushes to GitHub; notifies Amira when done.

## Why Rajiv wants this

| Stated motivation | Subtext |
|---|---|
| **Cost savings** — offload LLM-heavy build work from cloud Anthropic/OpenAI calls to local Codex CLI | Build is the most token-intensive phase; potentially much cheaper if remote infra absorbs it |
| **Mimics human workflow** — agent looks like a contractor with a Jira ticket and a GitHub repo | Easier sales/onboarding into traditional engineering orgs that already think in tickets and PRs |
| **Easier Jira/PM tool integration** — agents become fungible labor units in existing tooling | Reduces friction adopting Amira; agents drop into existing process rather than asking org to adopt a new platform |

## Cesar's three concerns

1. **Security**: remote agents need access to data, secrets, internal databases hosted on the cloud platform. Ale confirmed they hit identical pain in QML proxy work — secret exchange across trust boundaries is non-trivial.
2. **Architectural**: ephemeral Kubernetes pods don't fit a 24/7 remote-agent model. Mars architecture is built around ephemeral isolation; a long-lived remote agent breaks that pattern.
3. **Philosophical**: Amira's pitch is "hides complexity from the user." Distributed model exposes it — the user has to think about which agent runs where, when, with what access.

## Decision (end of call)

- **Mars deployment stays on the cloud architecture as planned.** No change to Cesar's spec.
- **Cesar will think about the communication layer for remote agents separately** — not as Mars work, as exploratory.
- **Rajiv asked Farzaneh for proposals** on how the two architectures could coexist. To be discussed 2026-05-05.

## My framing of the real architectural question

The tension isn't "where does coding execution run." It's **secrets and audit boundaries**. Cesar's cloud builder has full Databricks/FMP/QML access via OBO + Key Vault, hash-chained ledger, deploy-gates, Kata-Firecracker isolation. A laptop running Codex doesn't and shouldn't have any of that. So the right question is:

> What part of the lifecycle can run remote without breaking the Mars compliance story (Cohasset-assessed for SEC 17a-4(f) / FINRA 4511(c) / CFTC 1.31(c))?

## Three coexistence options

| Option | Shape | Mars impact | Captures cost win? | Hard part |
|---|---|---|---|---|
| **A. Pluggable Build backend** | Same Spec Agent + same handoff envelope (Phase 1.6 contract). Build Agent has two backends: cloud-AKS-Kata (default) and remote-Codex (opt-in). Per-job routing. | Zero — cloud stays default. | Yes, when remote selected. | Secrets boundary for remote backend. |
| **B. Remote for non-build only** | Spec drafting, refactor proposals, test gen, doc writing run remote. Builds stay cloud. | Zero. | Partial — only the lighter token loads. | Underwhelms Rajiv's vision; doesn't address build cost. |
| **C. Hybrid "remote codes, cloud verifies"** | Remote agent writes code + opens a PR. Cloud builder checks out PR, runs tests + deploy-gates + merges. | Zero. | Yes. | Verification round-trip is new infra; PR cycle adds latency. |

## Recommended: A + C combined

**Pluggable Build backend, where the remote mode is constrained to "writes code only; cloud verifies + holds the keys."**

This directly answers Cesar's three concerns:

- **Security**: remote never touches Mars secrets — only the spec, repo creds, bounded test data. No OBO tokens leak across the trust boundary. Whatever the QML proxy work hit on secret exchange, this design avoids by not exchanging the secrets at all.
- **Audit**: every remote assignment + PR + cloud verification logs into the same hash-chained ledger. Git is the artifact, ledger is the audit record. The Cohasset compliance story stays intact because the system-of-record never moves.
- **Ephemeral pods**: irrelevant — verifier runs ephemeral as today; remote agent doesn't try to be a pod, it tries to be a developer.

Bonus: this matches Rajiv's "agent looks like a human teammate with a Jira ticket and a GitHub repo" framing exactly. The metaphor he kept reaching for IS the architecture.

## Open questions to pin down before going further

1. **What's "remote"?** Developer laptop, leased VM with Codex CLI 24/7, ephemeral cloud-burst container, or BYO-compute on customer side? Each has different cost / secrets / networking implications. My guess: leased VMs with Codex CLI is what Rajiv has in mind, but worth confirming directly.
2. **Who pays for remote infra?** QDT-managed leased VMs (we save on tokens, we eat infra) vs customer-side machines (we ship the comms layer, customer brings compute). Different product shape and pricing model.
3. **First experiment should be Spec, not Build.** Spec is lightweight, has no cloud-secret needs. Shaking out the markdown-handoff + notify-back loop on Spec is cheaper, lower-risk, and proves the substrate. If it works for Spec, we know it'll work for Build.
4. **Jira hooks are separable.** The "agent looks like a Jira assignee" UX win can ship on the cloud builder today. Worth saying out loud so the team doesn't conflate the metaphor win with the execution-location bet — they're orthogonal.

## What to take to the team

A one-pager that says:

> Yes, distributed agents are a real Track 2. Modeled as a pluggable Build backend with remote constrained to "remote codes, cloud verifies." Proven on Spec first. Mars track (Cesar's cloud architecture) unchanged. We learn cost numbers from QDT-internal proof before considering it for enterprise customers.

This keeps Cesar's architecture intact, gives Rajiv a concrete path instead of "we'll think about it," and gives the team something to react to in the next call.

## Adjacent: Google Cloud "Best of Next '26 for SMB" webinar (May 12, 2026)

Farzaneh shared the invite mid-discussion — themes ("Build AI apps in minutes," "Force Multiplier with Gemini Enterprise," "Agentic ROI framework") rhyme with Amira's pitch but it's SMB-audience marketing depth, not architectural. Verdict: register for replay, watch on 1.5x for two specific things — (1) how Google demos "build apps in minutes" (competitive positioning intel since Mars is Google-preferred), (2) Google's Agentic ROI framework variables (benchmark for Rajiv's commercial proposal pitch). Not blocking, not architectural. NOT a substitute for tomorrow's discussion.

## Things NOT to confuse

- **Track 1 (Mars cloud)** ships on Cesar's existing roadmap (~1 month per his 2026-04-29 estimate). This proposal does NOT delay or modify Track 1.
- **Track 2 (distributed agents)** is exploratory. Even if greenlit later, it would target QDT internal use first, then optional enterprise customers — never the default Mars deployment.
- **Jira-style UX** is achievable on Track 1 today. Don't let "agent looks like a teammate" become a reason to choose Track 2 — it's a cross-cutting capability, not architecture-bound.

## Related references

- `project_amira_architecture_canonical.md` — Cesar's locked Mars architecture (do NOT modify based on this track)
- `project_amira_vision.md` — 3-agent pipeline; Build Agent is what gets the pluggable backend in this proposal
- `project_amira_platform_repo.md` — Phase 1.6 handoff Artifact contract is the input to whichever Build backend executes
- `project_next_session.md` — discussion agenda for 2026-05-05
