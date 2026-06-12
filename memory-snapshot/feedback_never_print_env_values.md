---
name: never-print-env-file-values-into-the-session-transcript
description: "2026-05-23 morning. While checking apps/api/.env existence + key presence before booting the backend for Phase 12 testing, I ran `grep -v \"^#\" apps/api/.env` which printed the full file contents — including the real `ANTHROPIC_API_KEY` value + 3 dev secrets (Auth0 client secret, session cookie secret, refresh token key). The values landed in the session transcript scrollback. Farzaneh had to rotate the production Anthropic key as a result. This memory locks the rule + the safe verification patterns."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0973fe7c-3e3a-47eb-a295-6a31f61d994f
---

## The rule

**Never print the contents of `.env` files, secret files, or any file
that may contain key=value secret material into the terminal output.**

This includes:
- `apps/api/.env` (Anthropic key + Auth0 secret + session cookie secret + refresh token key)
- `apps/api/.env.example` (no real values but training-data adjacent)
- Any file matching `*.env`, `*.secret`, `*.pem`, `*.key`, `credentials.json`
- Any output that comes from `os.environ` print statements

A filter like `grep -v "^#"` or `grep -v "^$"` STILL prints values
verbatim. Only filters that mask the right-hand side of `key=value`
are safe.

## Trigger conditions

- About to run any `cat / head / tail / grep / awk / sed` against a
  file containing secrets
- Verifying a file exists + has the right shape before a `make`
  command
- Diagnosing a "key not found" error
- Onboarding to a new local dev setup
- Re-reading the recipe in `project_local_dev_setup.md`

## Safe verification patterns (use these instead)

**1. Just check existence + size (no contents):**
```bash
ls -la apps/api/.env
# -rw-r--r-- 1 farza 197613 1910 May 19 10:52 apps/api/.env
```

**2. Count keys present (no values):**
```bash
grep -c "^[A-Z]" apps/api/.env
# 13
```

**3. List key NAMES only (mask values):**
```bash
awk -F= '/^[A-Z]/ {print $1}' apps/api/.env
# or
sed -n 's/^\([A-Z_]*\)=.*/\1/p' apps/api/.env
# Returns: AMIRA_DB_DSN, AMIRA_AUTH0_DOMAIN, ANTHROPIC_API_KEY, ...
```

**4. Check ONE specific key is set without showing the value:**
```bash
grep -q "^ANTHROPIC_API_KEY=" apps/api/.env && echo "key present" || echo "MISSING"
```

**5. Validate value-shape without printing the value:**
```bash
awk -F= '/^ANTHROPIC_API_KEY=/ {print "present, length=" length($2)}' apps/api/.env
# present, length=108
```

## What NEVER to do

```bash
# ALL OF THESE PRINT THE FULL VALUE — banned:
cat apps/api/.env
cat apps/api/.env | head -20
grep -v "^#" apps/api/.env
grep -v "^$" apps/api/.env
awk '!/^#/' apps/api/.env
sed -n '/^#/!p' apps/api/.env
```

The pattern `grep -v` (invert match) on comment lines is the most
seductive mistake — it FEELS like a filter that "removes the comment
noise" but actually it prints every key=value line verbatim.

## What to do when you slip up (it happens)

1. **Stop immediately**. Do not continue with whatever you were
   doing — the transcript already has the value.
2. **Tell the user immediately + identify which secrets leaked**.
   Do NOT downplay.
3. **Give exact rotation guidance**:
   - Anthropic key: console.anthropic.com → Settings → API Keys →
     revoke + generate new
   - Auth0 client secret: Auth0 Dashboard → Applications → [app] →
     Settings → Client Secret → Rotate
   - Session cookie / refresh token keys: regenerate locally with
     `openssl rand -base64 32` (dev-only, lower urgency)
4. **Wait for user to confirm rotation** before any further work
   in the affected session.
5. **Bank the incident**: which command, which filter, what slipped.
   Update this memory file with new safe-pattern variants if a new
   class of mistake surfaced.

## Why this rule matters more than "just be careful"

The session transcript persists. If the user reviews the session
later, screen-records it, shares a snippet for debugging, or if the
transcript is auto-archived to disk somewhere — the secret travels
with it. Anthropic production keys especially have high blast radius
(real billing + real production-call capability).

Compare to a git commit: git history can be rewritten, the bad
commit can be force-pushed away. Session transcripts are
append-only and out of the user's direct control.

So: defense in depth. The .env file IS gitignored. The values DO
live encrypted in Azure Key Vault for production. The local dev
keys are sketchier but still real. The session transcript layer
must independently never see the values.

## Related locks

- `feedback_qml_confidential.md` — same family for QML API doc + key
- `feedback_anthropic_key.md` — Claude Code overrides OPENAI_API_KEY
  too; use FINIQ_-prefixed fallbacks to avoid the override interfering
- `feedback_no_premature_commits.md` — the same general principle:
  don't take irreversible action without explicit go

## 2026-05-27 mid-day — new failure mode: WSL bridge mangles `awk -F=`

**Slip**: Tried to list key names only via:
```bash
wsl -d Ubuntu -- bash -lc "awk -F= '/^[A-Z]/ {print \$1}' /mnt/d/amira-mars/apps/api/.env"
```

The `-F=` separator got eaten somewhere in the layered shell escaping
(`cmd.exe` → `wsl` → `bash -lc` → `awk`). awk fell back to whitespace as
field separator, $1 became the whole line, and the full file was
printed — exposing the real `ANTHROPIC_API_KEY`, `AMIRA_AUTH0_CLIENT_SECRET`,
`AMIRA_SESSION_COOKIE_SECRET`, `AMIRA_SESSION_REFRESH_TOKEN_KEY_B64`.

**Local-only exposure** (transcript on Farzaneh's laptop; no external surface;
no git, no GitHub, no chat, no Anthropic logs). Farzaneh: *"only locally is
fine, no one has access to my laptop. but be careful even with this for the
next time."* No rotation taken — same risk surface as the .env file itself.

**Root cause**: `awk -F<X>` flags where `<X>` is a special shell character
(`=`, `:`, `\t`) do NOT survive cleanly through multi-layer shell escaping.
The flag *looks right* in your Bash invocation but arrives at awk with a
different value or missing entirely.

**New safe patterns through WSL bridge** (no flags that can get mangled):

```bash
# SAFE — grep with anchored regex, prints matched text only (key name)
wsl -d Ubuntu -- bash -lc "grep -o '^[A-Z_][A-Z_0-9]*' /path/.env"

# SAFE — sed capture group, prints \1 only (key name)
wsl -d Ubuntu -- bash -lc "sed -n 's/^\([A-Z_][A-Z_0-9]*\)=.*/\1/p' /path/.env"

# SAFE — count only
wsl -d Ubuntu -- bash -lc "grep -c '^[A-Z]' /path/.env"

# SAFE — presence-by-exit-code (no stdout content from the file)
wsl -d Ubuntu -- bash -lc "grep -q '^ANTHROPIC_API_KEY=' /path/.env && echo present"
```

**Defensive heuristic**: before any command that touches a secrets file
through the WSL bridge, ask "would this still be safe if the `-F` / `-d` /
`-t` flag got dropped?" If no, rewrite to use anchored regex with no separator
flag at all.
