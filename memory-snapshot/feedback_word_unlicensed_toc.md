---
name: Word "Unlicensed Product" mode mangles TOC fields on save
description: When Farzaneh's Word is in Unlicensed Product / Most-features-disabled mode, real Word TOC fields render correctly in-memory but the field structure vanishes when she saves. For docx delivery to a Word user with this license state, prefer static TOC text or hand off to the user to rebuild manually in Word. Plus 3 adjacent lessons on docx round-trips.
type: feedback
originSessionId: 703a7113-29be-4087-85ba-c27e34fbdc47
---

## The bug we hit (2026-04-28 early morning, Mars Phase 2 proposal)

Built INLINE + APPENDIX versions of Rajiv's polished proposal docx. Both versions had Rajiv's hand-typed manual TOC at the top, but with 28 inserted screenshots the page numbers shifted, so the TOC needed to be rebuilt.

**First attempt — real Word TOC field**:
- Programmatically replaced the manual TOC paragraphs with a Word `TOC \o "1-3" \h \z \u` field
- Set `<w:updateFields w:val="true"/>` in `settings.xml` so Word silently refreshes the field on open
- Farzaneh opened the file in Word; the TOC populated correctly with all entries + page numbers (screenshot confirmed it looked right)
- She added a Ctrl+Enter page break before "1. Introduction" (TOC and Introduction were sharing a page) and saved
- **After save: the entire TOC vanished from the saved file.** Verified by re-reading the docx with python-docx — paragraphs went straight from cover page to "1. Introduction" with no TOC content between.

**The clue we missed at first**: her Word title bar said *"Word (Unlicensed Product)"* with a banner reading *"Most features are disabled because your Office product is inactive."* This wasn't decorative — that mode appears to compromise TOC field serialization on save.

**Second attempt — static TOC paragraphs**:
- Replaced the manual TOC with 33 plain paragraphs (INLINE) / 49 paragraphs (APPENDIX) styled with tab stops at 6.3" right-aligned with `WD_TAB_LEADER.DOTS`
- Page numbers hand-computed: INLINE numbers verified from her earlier screenshot (when the field had rendered correctly), APPENDIX numbers estimated based on heading position + image distribution
- Closer to working but Rajiv's exact tab-leader spacing wasn't perfectly matched

**Final fix — Farzaneh manually rebuilt the TOCs in Word**. Reported: *"none of the foxes worked. i fixed them here. this will be our final proposal files"*. Final files dropped to `C:/Users/farza/Downloads/`, copied to canonical `D:/Amira FinIQ/`.

## Rule going forward

**When delivering a docx to a Word user whose license state may be inactive/expired/disabled**:

1. **Don't ship a Word TOC field.** It may render visually but won't survive their save → next time they edit and save, the TOC silently disappears.
2. **Either**:
   - Ship a static TOC built from python-docx paragraphs with explicit tab stops + dot leaders (good but tab-leader styling can be finicky to match the doc's existing aesthetic)
   - **OR** ship without a TOC and ask the user to insert via *References → Table of Contents* in their Word — they can do this in 2 clicks even in unlicensed mode (the insertion works; only the field's update-on-save serialization is what fails)
3. **Verify after their save.** If the deliverable round-trips through their Word at any point, re-read the saved file with python-docx and check that the TOC content is still present. Don't trust the screenshot — it shows in-memory rendering, not what serialized.

## Adjacent lessons codified the same session

### macOS-zipped archives include `__MACOSX/` sidecar metadata folder

When a peer on a Mac sends a `.zip`, expect to see:
- `realfolder/file.png` (the actual content)
- `__MACOSX/realfolder/._file.png` (0-KB AppleDouble metadata stub — file color labels, Finder info, etc.)

Windows / Linux users don't need the `__MACOSX/` folder. Iterate only over the non-`__MACOSX/` paths. Tell the user it's not duplicate content; they're empty metadata stubs.

### Don't be too clever with python-docx for non-trivial Word features

For features like:
- Real Word TOC fields (with `updateFields`, cached content, field separators)
- Complex tab-leader formatting matching an existing doc's aesthetic
- Cross-references and bookmarks
- Track-changes or comments

Hand off to the user to finish in Word manually. Faster than debugging XML serialization, more reliable across Word versions and license states. Trying to build the perfect Word feature programmatically is a tar pit when the user has Word right there.

### When two viable delivery formats exist, send both with a one-liner

For the Mars proposal we built INLINE (screenshots scattered through body) and APPENDIX (screenshots in dedicated Workflow Walkthrough at end). Both are valid; each has tradeoffs (INLINE = visual evidence inline with claim; APPENDIX = clean prose for exec readers + dedicated demo for technical reviewers).

Instead of forcing a pick, send both with: *"Two versions — same content, screenshots inline vs. appendix. Pick whichever reads better; happy to consolidate."*

Gives the senior reviewer agency, signals you considered the tradeoff, costs nothing.

## Related memories

- [project_amira_pitch_deck.md](project_amira_pitch_deck.md) — full context of where this surfaced (Mars Phase 2 proposal)
- [project_finai_mvp2_plan.md](project_finai_mvp2_plan.md) — Phase 2 commercial proposal scope
