---
name: wsl-node-toolchain-corruption-after-dirty-windows-reboot-frontend-blocker-pattern
description: "2026-05-23 afternoon. Banked from Phase 12 Spec Agent testing block. When Windows reboots dirty (mid-write, no clean shutdown), the Node.js toolchain on both Windows AND WSL can land in a half-corrupted state that produces a deterministic V8 turbofan crash on every `next dev` launch. Six common workarounds (cache clear, --turbopack, --no-turbofan, --jitless, fresh Node via nvm, fresh native bindings) DO NOT fix it. The real fix is reinstalling Node from the Windows MSI + clean `rm -rf node_modules package-lock.json && npm install` from WSL. Diagnosis short-circuit: if V8 fatal `[next-server (...)]` annotation + identical fault address across multiple Node versions + 'Restoring pack failed: incorrect data check' in webpack cache → it's this pattern; don't chase workarounds, just reinstall Node."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0973fe7c-3e3a-47eb-a295-6a31f61d994f
---

## When to apply this pattern

Trigger conditions (ALL of):
- Windows laptop rebooted via Update / hard-shutdown / battery-die (NOT a clean Start → Shutdown).
- `next dev` (or any Node-driven dev server reading Windows-side node_modules via `/mnt/d/...` from WSL) crashes immediately at "Compiling ..." with V8 fatal.
- Crash signature includes:
  - `# Fatal error in , line 0` + `# unreachable code` + `#FailureMessage Object: 0x<addr>`
  - Native stack frames inside `[next-server (vX.Y.Z)]` or `[node (vX.Y.Z)]` annotation
  - Top frame in `v8::internal::compiler::turboshaft::MachineLoweringReducer::ReduceTruncateJSPrimitiveToUntagged` or similar V8 turbofan optimizer pipeline
- Identical fault address across multiple consecutive launches
- Identical "Ready in <N>s" wall-clock measurement (deterministic compile of identical input)
- `webpack.cache.PackFileCacheStrategy: Restoring pack failed ... incorrect data check` warning earlier in log

If you see ALL of these, DO NOT chase Next.js / Node version workarounds. Skip to fix path below.

## DO NOT bother with these (all empirically failed on 2026-05-23)

1. `rm -rf .next/cache` then `rm -rf .next` — same crash; webpack writes fresh cache that produces the same V8 input
2. `next dev --turbopack` (Rust bundler) — still uses V8 to JIT the runtime; same crash
3. `NODE_OPTIONS='--no-turbofan --no-maglev'` — `npm run dev` may not propagate NODE_OPTIONS to the `next-server` re-exec
4. `node --jitless /node_modules/.bin/next dev` — same propagation issue; next-server re-execs without the flag
5. `nvm install <other Node version>` — both Node 20 LTS and 22.x have V8 versions that crash on the same compiled JS chunk; the bug is in what V8 is compiling, not V8 itself
6. `npm install @next/swc-linux-x64-gnu` — fixing the SWC native binding doesn't help; SWC is the bundler not the runtime
7. Switching to Windows-side `node` from Git Bash / PowerShell — Windows Node's `npm` is ALSO broken (`Cannot find module 'C:\Program Files\nodejs\node_modules\npm\bin\npm-prefix.js'`) because Windows Defender quarantined Node helper scripts during dirty shutdown

## The real fix

1. **Reboot Windows fully** (Start → Power → Shutdown, then power on). Some V8 bytecode-cache quirks self-resolve after a CLEAN shutdown sequence.
2. **Reinstall Node.js LTS from the official Windows MSI** (https://nodejs.org/dist/v22.x.x/node-v22.x.x-x64.msi). This:
   - Restores the missing `npm-prefix.js` and other npm helper scripts that Windows Defender quarantined
   - Replaces the Node binary itself in case it was partial-write corrupted
   - Re-registers Node in PATH cleanly
3. **From WSL Ubuntu**, do a FULL clean reinstall:
   ```bash
   cd /mnt/d/amira-mars
   rm -rf node_modules package-lock.json .next
   npm install --no-audit --no-fund
   ```
   This step is critical: the existing `package-lock.json` may have been generated on Windows and lock platform-specific native bindings (e.g., `@next/swc-win32-x64-msvc`) that don't work on Linux. A fresh lockfile generated on WSL Linux resolves to the correct platform-native bindings (`@next/swc-linux-x64-gnu`).
4. **Start `next dev` from WSL** the same way as before. The crash should be gone.

## Why does the dirty reboot cause this?

Two contributing factors:
1. **Node helper scripts get quarantined**: Windows Defender runs heuristic scans on `.js` files during system shutdown. If shutdown is interrupted, some helper scripts (`npm-prefix.js`, etc.) end up in quarantine and never get restored.
2. **Mixed Windows/WSL native bindings**: when the original `npm install` was run from Windows (e.g., the user's first project setup), npm resolved Windows-platform native bindings (`@next/swc-win32-x64-msvc`). When the WSL `next dev` later tries to import them, it falls back to the WASM build. The WASM-on-V8 code path is what hits the `TruncateJSPrimitiveToUntagged` turbofan codegen bug in modern V8 (12.x, possibly earlier). Adding the Linux binding via `npm install @next/swc-linux-x64-gnu` post-hoc doesn't help because Next.js's binding-resolution logic already cached the WASM choice.
3. **WSL `/mnt/d/...` filesystem caching**: webpack's `.pack.gz` cache writes from WSL Linux to Windows NTFS go through 9P/Plan9 protocol with caching semantics that can corrupt mid-write blobs on dirty shutdown. The "Restoring pack failed: incorrect data check" warning is the visible symptom.

## Diagnosis short-circuit (banked for next time)

If a Node dev server suddenly stops working AFTER a Windows reboot:

```
1. Check the crash signature for `V8_Fatal` + `MachineLoweringReducer` + `[next-server (...)]`
   → If yes, apply this pattern's fix directly. Skip workarounds.
2. Check `ls node_modules/@next/` — if it shows BOTH `swc-win32-x64-msvc` AND nothing for Linux,
   that's confirmation the lockfile resolved on Windows.
3. Check `npm --version` from PowerShell on Windows — if it errors with
   `Cannot find module 'npm-prefix.js'`, confirm Windows Defender quarantine
   (visible in Windows Security → Virus & threat protection → Protection history).
```

Pattern banked here so future sessions can SKIP the 30+ minute workaround-chase that consumed Phase 12 testing on 2026-05-23 afternoon.

## Empirical reference

- Affected setup: Windows 11 + WSL2 Ubuntu + Node.js v22.22.0 (Windows MSI install) + Node.js v22.22.3 (nvm in WSL) + Node.js v20.20.2 (nvm in WSL) + Next.js 15.5.15
- Project: `D:\amira-mars` (writable Windows path, mounted at `/mnt/d/amira-mars` from WSL)
- Crash address: `0x10267a1` in `[next-server (v15.5.15)]` — identical across all Node versions
- "Ready in" wall-clock: identical 57.4s across all attempts (deterministic compile)
- Time burned chasing workarounds: ~35 min before realizing the diagnosis pattern
- Workarounds that DID NOT help: 7 (listed above)
- Fix that DID work (deferred to next session): full MSI reinstall + clean WSL npm install