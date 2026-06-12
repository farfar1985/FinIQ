---
name: SRS v3.1 status (2026-03-27)
description: SRS v3.1 is now CURRENT — adds CI/FMP, suggested prompts, 52 FRs
type: project
---

## SRS v3.1 — Now the CURRENT spec

**Created by**: Rajiv Chandrasekaran (2026-03-27)
**File**: `FinIQ SRS v3.1 Final.docx` (root + app/)
**Total FRs**: 52 (up from 50 in v3.0)

### What's new vs v3.0
1. **FR4.5: Suggested Prompt Library** — 18+ curated query templates, dynamic variables, Cosmos DB storage, usage tracking
2. **FR4.6: Prompt Variable Resolution Engine** — Auto-resolve {unit}, {current_year}, {current_period}, {current_quarter} against FinSight dimensions
3. **Section 7: CI Module with FMP API Integration**:
   - Financial Modeling Prep API for real-time competitor data
   - 10 competitors: Nestle, Mondelez, Hershey, Ferrero, Colgate-Palmolive, General Mills, Kellanova, J.M. Smucker, Freshpet, IDEXX
   - SWOT Analysis (auto-generated quarterly)
   - Porter's Five Forces (quantified via HHI)
   - Earnings Call Intelligence (NLP on transcripts)
   - Financial Benchmarking Dashboard
   - Competitive Positioning Map (2D scatter)
   - M&A Tracker
   - FMP Enterprise plan: $499/month
4. **Appendix C: Suggested Prompt Catalog** — 18 prompts in 5 categories (Bridge/Waterfall, Margin, Revenue, KPI Summary, Customer/Cost)

### Companion document
**Frontend Design Guideline v1.0** (`FinIQ Frontend Design Guideline v1.0.docx`)
- Created by Alessandro (Atlas), converted to Word by Rajiv
- Bloomberg-inspired, OKLCH colors, Recharts, shadcn/ui, Tailwind CSS

### Next step
Both docs get combined into a unified build prompt for Artemis's clean slate rebuild.
