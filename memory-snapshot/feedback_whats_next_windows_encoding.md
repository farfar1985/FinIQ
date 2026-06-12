---
name: Run amira-mars `scripts/whats_next.py` on Windows with `PYTHONUTF8=1`
description: Cesar's whats_next.py uses `subprocess.run(text=True)` for the `gh` shell-out, which on Windows defaults to cp1252. gh's JSON output is UTF-8 with em-dashes in every ticket title. The mismatch garbles `—` to `â€"` and the title regex silently fails to match — every ticket gets dropped, the script reports 0 ready and 0 blocked. Run the script with `PYTHONUTF8=1` set OR pass `-X utf8` to python to force UTF-8 mode globally.
type: feedback
originSessionId: 50903b7b-9718-4c73-ab24-6d193b5dda59
---
**Always set `PYTHONUTF8=1` (or pass `-X utf8`) when running `scripts/whats_next.py` on Windows.**

## Why

The script's `gh` subprocess wrapper is:

```python
def gh(*args, parse_json=False):
    res = subprocess.run(["gh", *args], capture_output=True, text=True)
    ...
```

`text=True` on Python 3.x decodes stdout using `locale.getpreferredencoding(False)`. On a fresh Windows install that's typically **cp1252** (Western European ANSI). gh's JSON output is **UTF-8** containing em-dashes (`—`, U+2014) in every ticket title (the standard `T-M1-NN — <description>` format). Decoding UTF-8 bytes as cp1252 produces gibberish like `â€"` instead of `—`.

The script's title regex `^(T-M\d+-\d+)\s*—\s*(.+)$` then fails to match (because the literal `—` in the regex doesn't equal the gibberish in the parsed title), every ticket is skipped via `if not tid: continue`, and the script reports `READY (0) — nothing yet, BLOCKED (0)` on a milestone that actually has 63 open issues.

`PYTHONUTF8=1` (Python 3.7+ "UTF-8 Mode") forces all encoding to UTF-8 globally — stdout, stdin, file I/O, AND `subprocess.run(text=True)`. Fixes the issue.

## How to apply

In PowerShell:

```powershell
$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"   # also helps with emoji output (✅ ⏸)
chcp 65001 | Out-Null               # PowerShell codepage to UTF-8 too, for clean printing
python scripts/whats_next.py farzaneh
```

Or one-shot:

```powershell
python -X utf8 scripts/whats_next.py farzaneh
```

Or in `.bashrc` / shell profile, set `export PYTHONUTF8=1` so it's automatic.

## Why this isn't on Cesar's radar

Cesar develops on Linux/Mac where `locale.getpreferredencoding()` returns UTF-8 by default. He hasn't seen the failure mode. Worth a small one-line PR if we want — change:

```python
res = subprocess.run(["gh", *args], capture_output=True, text=True)
```

to:

```python
res = subprocess.run(["gh", *args], capture_output=True, text=True, encoding="utf-8")
```

That fixes it for every Windows user without requiring `PYTHONUTF8=1`. Low-risk, single-line. Fileable as a PR titled `fix(scripts): force utf-8 encoding for subprocess on Windows` or similar — but only after we have a real ticket landed first (don't open script-fix PRs as our debut contribution; ship a real ticket first, then squeeze the polish in).

## How to verify the fix worked

After running with `PYTHONUTF8=1`, the output should show:

```
✅ READY (N) — start at the top:
  • #X    T-M1-NN    <ticket title>  [owner]

⏸  BLOCKED (M) — will unblock as upstream tickets close:
  • #Y    T-M1-MM    <ticket>...  ← needs T-M1-AA, T-M1-BB  [owner]
```

If you see those structured lists with real ticket IDs, encoding is working. If you see `READY (0)` and `BLOCKED (0)` on a milestone with known open issues, you forgot the env var.
