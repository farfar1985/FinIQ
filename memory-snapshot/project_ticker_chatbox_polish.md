---
name: Ticker Strip + Chatbox Position Polish (2026-04-16, local-only)
description: Cesar's WhatsApp UI feedback — ticker strip only on CI page, chatbox anchored to viewport bottom without scroll dependency. Implemented.
type: project
originSessionId: 85d817ff-6a6a-4668-8250-333e81492948
---
**Cesar's feedback (WhatsApp 2026-04-16 evening)**:
1. Stock prices ticker shouldn't show on the main chat page (noisy when user isn't doing CI).
2. Chat input bar should be fixed at viewport bottom without depending on scroll position (on page load the bar was mid-page and user had to scroll to find it).

**Fix landed (local, not pushed)**:

**1. Ticker strip route-gated** in `src/components/app-shell.tsx`:
```tsx
import { usePathname } from "next/navigation";
const pathname = usePathname();
const showTickerStrip = pathname?.startsWith("/competitive") ?? false;
// ...
{showTickerStrip && <TickerStrip />}
<main className={cn(showTickerStrip ? "pt-20" : "pt-12", ...)}>
```
Ticker only renders on `/competitive*` routes. Main top padding halves when ticker hidden.

**2. Chat area height calc corrected** in `src/components/unified/unified-content.tsx`:
- Old: `h-[calc(100vh-5.5rem)]` — assumed ticker strip always present (header 48px + ticker 32px + spacing)
- With ticker removed, old calc left 40px dead space at the bottom, pushing the input bar up
- First attempt `calc(100vh-3rem)` was too aggressive — ignored `p-4` wrapper padding (32px vertical) → input bar overflowed below viewport
- Final: **`calc(100vh-6rem)`** = 96px. Accounts for header (48px) + p-4 wrapper top+bottom (32px) + small visual gap (16px). Input bar sits cleanly above viewport bottom.

**Risk**: Zero. Client-only hot-reload. No backend. Both files untouched by any other work.

**Note**: Only unified chat page (home `/`) uses these calcs. Other pages (Reports, Jobs, Help, Admin) have their own layout — not affected.
