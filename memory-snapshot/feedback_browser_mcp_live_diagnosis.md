---
name: feedback-browser-mcp-live-diagnosis
description: "When a local web app misbehaves in a way code-reading can't settle (e.g. 'I can't type in the box' but the component code looks correct), use the Claude-in-Chrome MCP to inspect the LIVE DOM/console instead of guessing. Connect (list_connected_browsers → select_browser → tabs_context_mcp createIfEmpty → navigate → javascript_tool / read_console_messages), reproduce in a controlled MCP tab (works when the bug is systemic), and read disabled/readOnly/getComputedStyle/elementFromPoint + an ancestor-width walk. This is how the Spec Agent composer '24px-wide textarea' bug was root-caused on 2026-06-01. Gotcha: navigate forces https:// — pass explicit http:// for an http dev server."
metadata:
  node_type: memory
  type: feedback
  created: 2026-06-01
  originSessionId: 865f4eec-9f0d-42a4-84f4-46f0ab7b8fca
---

# Live frontend root-cause via the Claude-in-Chrome MCP

**When:** a running local web app misbehaves and reading the component source doesn't settle it — the code looks correct but the UI is wrong (classic: "I type and nothing appears," a control that won't click, a layout that's off). Don't keep theorizing from source; **inspect the live runtime.**

## Why it beats code-reading here
On 2026-06-01 the Spec Agent chat composer wouldn't accept typing. Reading `AmiraChat.tsx` + `prompt-input.tsx` + `input-group.tsx` proved the textarea was uncontrolled, not disabled, not readonly, no overlay — i.e. per the code it *should* work. Only the live DOM revealed the truth: **`width: 24px`** (a flex collapse). Code-reading alone would never have shown the computed width.

## The flow (tools are deferred — ToolSearch `select:` to load)
1. `mcp__Claude_in_Chrome__list_connected_browsers` — confirm a browser is connected (`isLocal:true`).
2. `mcp__Claude_in_Chrome__select_browser` with its `deviceId`.
3. `mcp__Claude_in_Chrome__tabs_context_mcp` with `createIfEmpty:true` → get a tabId (creates a NEW MCP tab/window; does NOT touch the user's tabs).
4. `mcp__Claude_in_Chrome__navigate` to the page. **GOTCHA: `navigate` defaults to `https://`** — for an http dev server pass the explicit `http://localhost:3000/...` or you get `ERR_SSL_PROTOCOL_ERROR` (a chrome-error page; `javascript_tool` then returns the error page, not your app).
5. `mcp__Claude_in_Chrome__javascript_tool` (`action:"javascript_exec"`) — run a probe. Use an IIFE returning a `JSON.stringify(...)` (no top-level `return`). Useful probes for an input bug:
   - `el.disabled`, `el.readOnly`, `getComputedStyle(el).{pointerEvents,visibility,opacity}`
   - `el.getBoundingClientRect()` → **width/height** (catches collapse)
   - `document.elementFromPoint(cx,cy) === el` → detect an overlay on top
   - programmatic set via the native setter + `dispatchEvent(new Event('input',{bubbles:true}))` → does the value stick? (rules out controlled-frozen-value)
   - **ancestor-width walk** (loop `el = el.parentElement`, log width + display + flex props) → find exactly which ancestor collapses the dimension.
6. `mcp__Claude_in_Chrome__read_console_messages` (always pass a `pattern`) — catch JS/hydration errors.
7. **Test the fix live before editing code:** mutate inline styles in the probe and re-measure (e.g. set `flex-wrap:wrap` + `flex:1 0 100%` → width 24→325). Confirms the CSS fix works, THEN apply it in the source.
8. `mcp__Claude_in_Chrome__tabs_close_mcp` the tab when done (keeps the user's browser clean).

## Notes
- The MCP only drives tabs in ITS group, not the user's existing tabs. If the bug is **systemic** (every load is broken), reproduce it by navigating a fresh MCP tab to the same URL — same build, same bug. (Confirm systemic first: have the user try a fresh tab; if it also fails, it's the build, not their tab state.)
- Cookies are shared per Chrome profile, so the MCP tab loads authenticated (same session) — no re-login.
- After confirming the root cause + a working inline fix, apply the real fix in source (scoped CSS / a comparator / etc.), reload the MCP tab, and re-measure from the source change (no inline hack) to prove the *code* fix works.
- This is read-mostly diagnosis on the user's live machine — fine. It is NOT a remote write; no confirmation gate needed for inspection. (Editing source + pushing still follows the normal rules.)
- **Stale-tab corollary (reinforced 2026-06-01, deployed `amira.qdt.ai`):** after a spec turn, the user's OWN tab may show STALE state (the #690 auto-refresh gap — "None yet" / an old gap count / no new rows), making a *successful, persisted* turn look *failed*. **Never conclude "it failed" from the user's tab — navigate a fresh MCP tab to the same URL (a fresh load reads the current DB) and verify the real state before reporting.** This bit us twice in one session (a decompose-all kickoff + a gap-resolution both looked empty/unchanged on the user's tab yet had fully persisted). Works the same on deployed as local — the auth cookie carries into the MCP tab.
