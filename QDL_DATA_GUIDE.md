# QDL / QML Data Access Guide

**Audience**: QDT engineers (Cesar, Amira platform team, app authors)
**Purpose**: Single reference for how to discover, interpret, and pull data from QDL (Q.Enterprise / QML) inside any Amira-built app.
**Status**: Internal team reference — not Mars-facing.

> **Confidentiality note**
> - The QML API documentation PDF and API keys are confidential and must not be pasted into code, git, issues, or shared with clients.
> - This guide describes the URL shape and param names (already in our own code) but does NOT reproduce the vendor PDF.
> - API keys live in `.env` only (`QML_API_KEY` / `QDL_API_KEY`), never hard-coded.

---

## 1. Mental Model

There are two distinct layers you interact with:

| Layer | What it holds | What you do with it |
|---|---|---|
| **Data Dictionary** (the catalog) | ~113k+ rows. Each row describes **one time series** — a symbol with fixed semantics (provider, frequency, unit, location, classification). | **Search it** to discover what's available before fetching. Never paginate the whole thing to the LLM. |
| **Time-series data** (the payload) | Actual historical values for a given `symbol + provider`. | **Fetch** by `(symbol, provider, t1, t2)`. Returns CSV or JSON depending on endpoint. |

Every useful interaction is a two-step dance: **search the dictionary to find the right symbol → fetch the time series for that symbol**. The dictionary is the map; the time series is the territory.

### What providers are under the hood

Cesar already knows these, but for reference — a few dozen upstream providers feed the dictionary. The ones we care about most for Mars work:

| Provider | What it has | Example use |
|---|---|---|
| `FRED` | ~30k US macro series (Fed Reserve Economic Data) | Consumer sentiment, unemployment, Fed funds rate |
| `TRAD_ECON` | Country-level macro (consumer confidence, CPI, PPI) | CPI by country, consumer confidence by country |
| `DTNIQ` | Commodity futures (exchange data) | Cocoa, sugar, corn, coffee, palm oil, FX |
| `COMTRADE` | UN trade flows (imports/exports, bilateral) | Country-to-country commodity trade |
| `COINMETRICS` | On-chain crypto metrics | (Not Mars-relevant) |
| `WORLDBANK`, `EIA`, `MINTEC`, `QUANDL_EOD`, `CBOE_INDICES`, `URBA`, `VESPER`, `CRYPTO`, `WORLD_MARKETS`, `MARS_JACOBSEN` | Other specialized sources | Domain-specific |

Provider can also appear as a comma-joined chain (e.g., `QDL,QDTRETAIL,BINANCE`) — that encodes platform → subprovider → exchange context. For routing purposes treat the **first token** as the primary source.

---

## 2. The Data Dictionary — Column-by-Column

The catalog has **18 columns**. Seven of them carry most of the semantic weight; the rest are governance or modeling metadata. Full field reference below.

### 2.1 Quick reference table

| # | Column | Purpose | Agent importance |
|---|---|---|---|
| 1 | `in_use` | Active / deprecated flag (`1` = active) | Filter on this first |
| 2 | `symbol` | Primary identifier, e.g., `ADA_ADRACTCNT` | Used to fetch data |
| 3 | `provider` | Upstream source (see table above) | Used to fetch data |
| 4 | `name` | Human-readable description | **Primary semantic match field** |
| 5 | `frequency` | Granularity: Daily / Weekly / Monthly / Quarterly / Yearly | Filter for user's cadence |
| 6 | `exchange` | Trading venue (often null for macro) | Useful for crypto / futures |
| 7 | `category` | Top-level domain (Macroeconomics, Commodities, Equities, etc.) | First filter |
| 8 | `sub_category_1` | Subdomain (e.g., `Prices`, `Labor`) | Refines category |
| 9 | `sub_category_2` | More specific type (e.g., `CPI`, `Unemployment`) | Refines subdomain |
| 10 | `location` | Country / region (`USA`, `FRA`, `USA_CA`, …) | Geographic filter |
| 11 | `start_date` | First observation available (`YYYY-MM-DD`) | History depth |
| 12 | `currency` | Monetary unit (`USD`, `EUR`, `€`, `No Currency`) | Disambiguate price series |
| 13 | `unit` | Measurement unit (`Index`, `Metric Tonne`, `Percent`, …) | Disambiguate quantity series |
| 14 | `extra` | Free-form provider notes, methodology | Fallback for niche queries |
| 15 | `valid_as_target` | `0` / `1` — can be a modeling target | Modeling questions only |
| 16 | `valid_as_predictor` | `0` / `1` — can be a feature | Modeling questions only |
| 17 | `authorized_groups` | Comma list: `QDL,QDTRETAIL,MARS,QSF,…` | Governance — filter per user |
| 18 | `classification` | Python-list-like hierarchy: `['Finance','Cryptoassets','Cardano','ADA']` | **Second primary semantic match field** |

### 2.2 What each column means — the details that matter

**`symbol`** — stable, uppercase-underscore identifier. Often encodes base asset + metric: `ADA_ADRACTCNT`, `MAC_TAX_CPI_USA`, `UMCSENT`, `@CC#` (DTN-style futures). Not always human-readable. Use it as a **secondary hint**, not primary search.

**`name`** — always human-readable. *This is where you search first* for user queries. ~74k unique values. Examples:
- `ADA Addresses, active, count`
- `Germany GDP, constant prices, quarterly`
- `US Crude Oil Stocks, weekly, thousand barrels`
- `Copper price, LME, USD per metric tonne`

**`frequency`** — observed distribution:
- Monthly ~66,700 series
- Daily ~22,700 series
- Weekly ~13,600 series
- Quarterly ~10,500 series
- Yearly ~60 series

If user doesn't specify, return multiple frequencies but highlight which.

**`category` / `sub_category_1` / `sub_category_2`** — three-level taxonomy. Common top-level `category` values:
- `Fundamentals` ~37.7k
- `Macroeconomics` ~33k
- `Commodities` ~25.6k
- `Equities` ~7.8k
- `Cryptoassets` ~2.3k
- Plus `Commitment of Traders`, `Finance`, `Indices`, `Weather`, `Currencies`, `Bonds`, `Business`, `Technicals`, `Interest Rates`, `Commodities News`

Use category as the **first filter** on "what kind of data do we have for X".

**`location`** — country or subnational code. Strongest coverage: `USA` (~24k), US states (`USA_TX`, `USA_CA`, …), plus `FRA`, `GBR`, `CHN`, `ITA`, `DEU`, `ESP`, `CAN`, `BRA`, `AUS`, etc. Global / multi-country series may leave this empty.

**`classification`** — looks like `['Finance', 'Cryptoassets', 'Cardano', 'ADA']`. Ordered broad-to-specific: super-domain → domain → asset/entity → ticker. **This and `name` are the two most useful fields for semantic search**. Parse as list for structured matching, or treat as plain text for LLM retrieval.

**`valid_as_target` / `valid_as_predictor`** — binary flags for modeling use. Only relevant when user asks about building forecasts / features. Safe to ignore for descriptive queries.

**`authorized_groups`** — access control. Common tokens: `QDL` (core platform), `QDTRETAIL` (retail clients), plus partner codes (`MARS`, `QSF`, `CME`, `NSE`, `MCD`). If the calling user's groups don't intersect, filter the row out. How the agent learns the user's groups is app-specific.

### 2.3 Query-to-field mapping cheat sheet

When a user asks a natural-language question, this is the mapping the agent should apply:

| User asks about… | Filter on |
|---|---|
| Topic / domain ("crypto", "macro", "commodities") | `category`, `sub_category_*`, `classification` |
| Specific entity / asset ("Cardano", "Germany", "copper") | `name`, `classification`, sometimes `symbol` |
| Geography ("for Italy", "US states") | `location` |
| Cadence ("daily", "monthly") | `frequency` |
| Units / currency ("in USD", "in tonnes") | `currency`, `unit` |
| Modeling / ML use ("can I use this as a predictor") | `valid_as_target`, `valid_as_predictor` |
| Licensing / provider ("from FRED", "any Binance data") | `provider`, `authorized_groups` |
| Very niche ("methodology notes") | `extra` |

**Ranking tip**: after filtering, rank candidates by textual similarity of `name` + `classification` to the user's phrasing, then by cadence relevance.

### 2.4 Worked examples

**Example 1 — Crypto on-chain question**
> User: "What on-chain metrics do we have for Cardano addresses?"

- Domain → `category = 'Cryptoassets'`
- Entity → `classification` OR `name` contains `Cardano` or `ADA`
- Sub-type → `sub_category_2` contains `Addresses` OR `name` contains `Addresses`
- Return symbols like `ADA_ADRACTCNT`, `ADA_ADRBAL1IN10KCNT` with their `frequency`, `start_date`, `unit`.

**Example 2 — Macro question**
> User: "Do we have quarterly real GDP for Germany?"

- Domain → `category = 'Macroeconomics'`
- Geography → `location = 'DEU'`
- Cadence → `frequency = 'Quarterly'`
- Content → `name` contains `GDP` + `real` or `constant prices`
- Disambiguate on `unit` + `currency` (nominal vs real, per-capita vs absolute, EUR vs USD).

**Example 3 — Modeling question**
> User: "Which monthly predictors are available for US unemployment modeling?"

- Usage → `valid_as_predictor = 1`
- Location → `location = 'USA'`
- Frequency → `frequency = 'Monthly'`
- Group the result by `category` / `sub_category_1` so the user can pick.

---

## 3. Pulling Data from QDL — API Patterns

There are **two endpoint patterns** in the wild today. Both are valid; pick by app.

### 3.1 Pattern A — CSV endpoint (simpler, what FinIQ uses)

```
GET  https://qdl.ai/get_datasource_csv/{SYMBOL},{PROVIDER}/{T1}/{T2}?key={API_KEY}
```

- `SYMBOL,PROVIDER` are **comma-joined** inside a single URL path segment, URL-encoded.
- `T1` / `T2` are datetimes in **`YYYYMMDDHHMMSS`** format (14 digits, zero-padded).
- Response is CSV. Header is either `time,value` (macro/single-value) or `time,close,high,low,open,volume` (OHLCV for price series). Pick `value` if present, else `close`.
- Auth: query param `?key=` with the `QML_API_KEY`.

**Reference implementation**: [`src/lib/qml-client.ts`](ale-build/src/lib/qml-client.ts) (FinIQ, TypeScript). ~100 lines. Handles: URL building, key masking in logs, 15s timeout, CSV parse, error bodies, empty-result detection, elapsed-ms logging.

Example call (from FinIQ):

```ts
// Fetch US CPI (12 months back)
const data = await fetchMacro12m("MAC_TAX_CPI_USA", "TRAD_ECON");
// → [{ date: "2025-04-01", value: 320.795 }, ..., { date: "2026-03-01", value: 330.213 }]
```

### 3.2 Pattern B — JSON endpoint (what Quantum AI uses)

```
GET  {QDL_API_URL}/qml/v1/get_symbol
       ?key={API_KEY}
       &tag={API_TAG}
       &symbol={SYMBOL}
       &provider={PROVIDER}
       &t1={YYYYMMDDHHMMSS}
       &t2={YYYYMMDDHHMMSS}
```

- Same `t1`/`t2` 14-digit format.
- Symbol and provider as **separate query params** (not comma-joined).
- Adds a `tag` param (Quantum AI uses `QDL_API_TAG` from settings — ask Cesar/QDT ops what tag string to pass).
- Response is JSON — either a top-level array of records or `{ "data": [...] }`. Each record has `time` + value columns (`value`, or `close`/`open`/`high`/`low`).

**Reference implementation**: [`D:\QuantumAI\src\noname\app\tools\qml.py`](D:/QuantumAI/src/noname/app/tools/qml.py), `_fetch_timeseries_impl()` — Python, httpx async, 30s timeout, in-memory + Redis cache.

### 3.3 Which one to use?

- **New apps**: prefer Pattern B (JSON). Cleaner response, richer metadata, matches Quantum AI's current agent stack.
- **Existing apps / small surface**: Pattern A (CSV) is simpler and we have a battle-tested TS client for it. FinIQ stays on A for now.
- Either way, **never** mix endpoints in the same session — stick to one per app.

### 3.4 Caching — always

QDL calls are 200–500 ms when cached upstream, 1–3 s cold, and occasionally stall at 10+ s. Always cache:

| Layer | Where | TTL |
|---|---|---|
| Raw fetch response | Redis or in-memory by `(symbol, provider, t1, t2)` | 4 h (what FinIQ uses for Mars-scale) |
| Dictionary loaded into DuckDB | Process-local | Lifetime of the process |
| Search results | Optional; the search is already fast | Don't bother |

Pattern A's raw bytes are ~1–200 KB per series (12 months monthly is ~500 bytes); Pattern B's JSON is ~2–10× larger. Cache liberally.

### 3.5 Error handling — what you actually hit in production

From FinIQ's logs (April 2026):

| Symptom | Real cause | Response |
|---|---|---|
| HTTP 200 in 27 ms, empty body | **Wrong host** (we had `quantumcloud.ai` instead of `qdl.ai`) — DNS-level reject | Fix host. Added to `[health]` startup check so this can never silently linger. |
| HTTP 403 | Bad key OR revoked tag | Check `QML_API_KEY` len in logs, confirm with QDT ops |
| HTTP 200, `"time,value\n"` only (header, no rows) | Symbol/provider valid but no data in date range | Widen `t1` or try a different provider for the same concept |
| `TypeError: fetch failed` within 50 ms | Network-level block (NSG / firewall / private endpoint restricting outbound) | Infra side — can't be fixed in code |
| Timeout > 15 s | QDL backend slow or Databricks-dependent upstream | Retry; increase timeout to 30 s if pattern repeats |

FinIQ's `qml-client.ts` logs every call with: URL (key masked to last 4 chars), elapsed ms, HTTP status + 200-char body preview on non-OK, parsed row count. Mirror this pattern — zero-observability clients are impossible to diagnose in production.

---

## 4. Finding Symbols — the `search_data_catalog` Pattern

Both our FinIQ app and Quantum AI's agent use the same conceptual flow: **search the dictionary → pick symbols → fetch them**. The difference is how the dictionary is loaded.

### 4.1 Quantum AI's implementation (reference pattern for new apps)

Location: [`D:\QuantumAI\src\noname\app\tools\qml.py`](D:/QuantumAI/src/noname/app/tools/qml.py), function `_search_data_catalog_impl`.

Key design choices:
- Dictionary CSV loaded once into **DuckDB in-memory** via `read_csv_auto` (fast, queryable, no Postgres needed).
- User's query tokenized to `raw_terms`; each term can have a country-code expansion (`germany` → `['germany', 'deu', 'deutschland']`).
- `SELECT` over columns `[name, symbol, category, provider, sub_category_1, classification, location]` with `LIKE '%term%'` on each, OR'd per term, AND'd per term group. LIMIT 20.
- Separate specialized paths for **trade queries** (kicks in when `import`/`export`/`trade` words are detected — joins Comtrade + ONI Parquet for richer bilateral trade breakdowns).
- Separate specialized path for **commodity intelligence** (enriches with top exporters, top importers, key ports from `commodity_index.json` + related JSON files).

Response shape (JSON):

```json
{
  "query": "cocoa prices",
  "catalog_results": {
    "count": 7,
    "results": [
      {"symbol": "@CC#", "provider": "DTNIQ", "name": "Cocoa Futures",
       "frequency": "Daily", "category": "Commodities", "location": null,
       "sub_category": "Futures"},
      ...
    ]
  },
  "comtrade": {
    "source": "comtrade",
    "total_matching_commodities": 12,
    "commodities": [...],
    "example_symbols": [...]
  },
  "commodity_intelligence": {
    "source": "commodity_intelligence",
    "matches": [{"sitc4": "0721", "description": "Cocoa beans",
                 "top_exporters": [...], "top_importers": [...], ...}]
  },
  "hint": "Use fetch_timeseries with symbol and provider to get actual data"
}
```

That rich-response pattern is the **reference for any new Amira app** — the agent can then decide whether the user wants raw catalog rows, trade breakdowns, or commodity context.

### 4.2 Lightweight pattern (what FinIQ uses)

For a narrow-domain app like FinIQ, we skip the DuckDB step entirely and **hard-code a curated list of relevant indicators**:

[`src/lib/macro-indicators.ts`](ale-build/src/lib/macro-indicators.ts) defines 9 Mars-relevant tags → `{symbol, provider, label, relevance}`:

```ts
export const MACRO_INDICATOR_MAP: Record<string, MacroIndicator> = {
  consumer_confidence: { symbol: "MAC_CONS_CONF_USA", provider: "TRAD_ECON", ... },
  cpi_inflation:      { symbol: "MAC_TAX_CPI_USA",   provider: "TRAD_ECON", ... },
  cocoa_prices:       { symbol: "@CC#",              provider: "DTNIQ",     ... },
  sugar_prices:       { symbol: "@SB#",              provider: "DTNIQ",     ... },
  coffee_prices:      { symbol: "@KC#",              provider: "DTNIQ",     ... },
  corn_prices:        { symbol: "@C#",               provider: "DTNIQ",     ... },
  palm_oil_prices:    { symbol: "@CPO#",             provider: "DTNIQ",     ... },
  currency_eur_usd:   { symbol: "@EU#",              provider: "DTNIQ",     ... },
  consumer_sentiment: { symbol: "UMCSENT",           provider: "FRED",      ... },
};
```

Then an LLM selects tags (not symbols) — keeps the prompt narrow, avoids symbol hallucination. This is the pattern for small apps with known data needs.

**Decision rule**: If the app has more than ~20 candidate indicators, use DuckDB + `search_data_catalog` (Pattern 4.1). If fewer, curated map + LLM tag selection (Pattern 4.2) is simpler and more reliable.

### 4.3 Auxiliary dictionaries you can layer on top

Quantum AI ships several supporting dictionaries next to the main data dictionary. If your app cares about trade / commodity / bilateral analysis, load these too:

| File | What it adds | Path (relative to Quantum AI repo) |
|---|---|---|
| `data_dictionary.csv` | Main dictionary, ~113k rows | `data/documents/data-dictionary/` |
| `comtrade_dictionary.csv` | Comtrade-specific symbols with HS codes | same |
| `ihs_products_codes.csv` | HS product code catalog for symbol construction | same |
| `sitc4_metadata.json` | SITC4 code → commodity description | same |
| `country_codes_dictionary.csv` | ISO3 ↔ UN numeric ↔ country name | same |
| `commodity_index.json` | Per-commodity top exporters / volumes | `data/documents/` |
| `commodity_top_importers.json` | Per-commodity top importers + share % | same |
| `commodity_by_port.json` | Per-commodity origin ports | same |
| `oni_data.parquet` | Full Comtrade bilateral flows (years × pairs × commodities) | `data/oni/` |

The loader code in `qml.py` (`_load_data_dictionary` → `_load_comtrade_dictionary` → `_load_hs_product_codes` → `_load_sitc4_metadata` → `_load_country_codes_dict` → `_load_oni_parquet` → `_load_commodity_intelligence`) is a good template to copy.

---

## 5. The End-to-End Pattern — LLM-Driven Data Pull

This is how FinIQ's macro enrichment actually works, top to bottom. Worth copying for any app that needs "an LLM looks at data and narrates".

### 5.1 Two-pass LLM architecture

```
User query ("why is Petcare OG declining?")
        │
        ▼
┌───────────────────┐
│ Pass 1 — LLM      │   Input: query + entity + brief system prompt listing VALID TAGS
│ pick tags         │   Output: JSON array of 2–4 tag strings
└─────────┬─────────┘   Model: small + fast (OpenAI gpt-5.4-mini), temperature 0
          │
          ▼
┌───────────────────┐
│ Resolve tags to   │   Pure function — no LLM, no API. Static map lookup.
│ (symbol,provider) │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Parallel QDL      │   Promise.allSettled — one concurrent call per indicator.
│ fetches (2–4x)    │   Each call is pattern A (CSV). ~1–3s total wall time.
└─────────┬─────────┘   Log per-call: symbol, elapsed, row count.
          │
          ▼
┌───────────────────┐
│ Summarize each    │   Pure function — pick latest / 3m / 6m / 12m-ago, compute
│ series to text    │   percent changes.
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Pass 2 — LLM      │   Input: original query + internal data summary + macro
│ synthesize        │   summaries. Output: 2–3 paragraph narrative.
└───────────────────┘   Model: same, temperature 0. Returns narrative + chart-ready
                        data (first indicator with ≥3 points).
```

Full code: [`src/lib/macro-enrichment.ts`](ale-build/src/lib/macro-enrichment.ts) (~220 lines).

### 5.2 Why two passes?

- **Pass 1 is constrained** (tag list in prompt, JSON-array-only output, low temp) → reliable, cheap, fast.
- **Pass 2 is open** (multi-paragraph narrative with specific numbers) → high quality because by this point all the facts are already in the prompt.

If you collapse both into one pass, the LLM drifts — either it hallucinates symbols or it skips the narrative step. Keep them separated.

### 5.3 Observability checklist

Every Amira app that touches QDL should log:

- [ ] **Startup**: `[health] QML/QDL connectivity established, 200 OK (N points)` — one fetch per source at boot
- [ ] **Per call**: URL with key masked (`***xxxx (len=N)`), elapsed ms, HTTP status, row count
- [ ] **On non-OK**: 200-char body preview of response
- [ ] **On success with empty result**: explicit warning — differentiate from network errors
- [ ] **LLM pass 1**: tags selected, or "fallback used"
- [ ] **LLM pass 2**: row count input, response length, synthesis elapsed ms

Copy the format from FinIQ's `qml-client.ts` — the `[qml] SYMBOL/PROVIDER OK in Xms — N data points` shape has saved us hours of debugging during Mars deploys.

### 5.4 Prompt-engineering notes (hard-won)

- **Tag the LLM to commodity-specific indicators** when the query is about a specific segment. Without this, the LLM defaults to `consumer_confidence` + `cpi_inflation` for everything and you never get segment-relevant insight. FinIQ's Pass 1 system prompt explicitly lists Mars segments and their input-cost drivers:
  ```
  - Petcare (Royal Canin, Pedigree, Whiskas): CORN prices drive input cost
  - Snacking/Chocolate (M&Ms, Snickers, Twix): COCOA and SUGAR drive input cost
  - Food & Nutrition: CORN and PALM OIL drive input cost
  - Gum/Mints (Wrigley, Orbit): SUGAR drives input cost
  ```
- **Constrain output shape in the system prompt AND the user prompt**: "JSON array of tag strings, e.g., `[\"consumer_confidence\", \"corn_prices\"]`". Repeat the format at both levels — Sonnet-class models ignore one-sided constraints more often than you'd think.
- **Always have a fallback.** Our `fallbackTags()` function maps keyword hits ("petcare", "chocolate", "europe") to default indicator sets if the LLM returns invalid JSON. Runs locally, no API call, keeps the app functional when OpenAI rate-limits or the key is missing.

---

## 6. Handling Schema Drift (the Mars lesson)

QDL symbols and providers are stable. But the *values* a symbol returns — and occasionally the symbols themselves — can evolve upstream. FinIQ's April 2026 deploys taught us two classes of drift:

| Drift type | Example | Detection |
|---|---|---|
| **Symbol rename** | Provider rolls an endpoint version, old symbol returns empty CSV | Empty-row warning + schema-discovery job running nightly |
| **Semantic drift** | Same symbol, methodology change (e.g., CPI re-weighting). Value series continues but means something different. | Golden-query suite — nightly compare latest values against a baseline, alert on >N% shift |

For Mars-critical apps, plan for the **drift-detection agent** pattern (see the in-flight proposal in `CLAUDE.md` under the 2026-04-22 session). Three buckets — auto-resolve unambiguous, auto-resolve-with-review ambiguous-but-feasible, flag-for-human can't-solve — all logged to an audit trail. Not built yet, but the architecture is designed.

For smaller apps, the **caching + logging** discipline above is usually enough — a nightly zero-point warning would catch most real issues.

---

## 7. Configuration — What Goes Where

### 7.1 Environment variables

```bash
# Required
QML_API_KEY=<provided by QDT ops>            # or QDL_API_KEY for pattern B

# Pattern B only
QDL_API_URL=https://qdl.ai/                  # base URL
QDL_API_TAG=<ask QDT ops>                    # tag for the v1/get_symbol endpoint
QDL_VERIFY_SSL=true                          # default; set false only for local dev

# Optional — only if loading the full data dictionary locally
DATA_DICTIONARY_PATH=data/documents/data-dictionary/data_dictionary.csv
COMTRADE_DICTIONARY_PATH=data/documents/data-dictionary/comtrade_dictionary.csv
HS_PRODUCTS_CODES_PATH=data/documents/data-dictionary/ihs_products_codes.csv
SITC4_METADATA_PATH=data/documents/data-dictionary/sitc4_metadata.json
COUNTRY_CODES_DICT_PATH=data/documents/data-dictionary/country_codes_dictionary.csv
ONI_PARQUET_PATH=data/oni/oni_data.parquet
```

**Never commit any of these keys.** If Amira platform centralizes secrets in Azure Key Vault, pull at runtime via managed identity — same pattern FinIQ uses for `DATABRICKS_TOKEN`.

### 7.2 Where to put the data dictionary

- If your app lives alongside Quantum AI: reuse `data/documents/data-dictionary/` in the monorepo — already loaded.
- If your app is standalone: copy the CSVs into your app's data folder OR expose a shared QDL-catalog service that every app can query (Amira platform-level). The latter is where Cesar's platform is heading.

---

## 8. File Reference

### FinIQ code (TypeScript, simpler pattern)

| File | Lines | Purpose |
|---|---|---|
| [`ale-build/src/lib/qml-client.ts`](ale-build/src/lib/qml-client.ts) | ~110 | HTTP client, CSV parse, logging |
| [`ale-build/src/lib/macro-indicators.ts`](ale-build/src/lib/macro-indicators.ts) | ~100 | Curated 9-indicator map, tag → (symbol, provider) |
| [`ale-build/src/lib/macro-enrichment.ts`](ale-build/src/lib/macro-enrichment.ts) | ~220 | Two-pass LLM orchestration |
| [`ale-build/src/lib/reference-data.ts`](ale-build/src/lib/reference-data.ts) | ~150 | Runtime cache pattern — mirrors what you'd do for a dictionary fetch |

### Quantum AI code (Python, full-featured pattern)

| File | Purpose |
|---|---|
| [`D:/QuantumAI/src/noname/app/tools/qml.py`](D:/QuantumAI/src/noname/app/tools/qml.py) | `search_data_catalog` + `fetch_timeseries` + forecast pipeline |
| [`D:/QuantumAI/data/documents/data-dictionary/technical_reference.md`](D:/QuantumAI/data/documents/data-dictionary/technical_reference.md) | Canonical 18-column semantics doc (source for §2) |
| [`D:/QuantumAI/src/noname/.claude/skills/data-explorer/SKILL.md`](D:/QuantumAI/src/noname/.claude/skills/data-explorer/SKILL.md) | Agent skill for UI-driven data exploration |
| [`D:/QuantumAI/src/noname/.claude/skills/forecast-dash/SKILL.md`](D:/QuantumAI/src/noname/.claude/skills/forecast-dash/SKILL.md) | Agent skill for the forecast dashboard |

### Architectural reference

- [`CLAUDE.md`](CLAUDE.md) — FinIQ project context; see 2026-04-08 "QML Macroeconomic Context Feature" section for the original integration history.
- `memory/project_qdl_macro.md` — our internal notes on the three-mode QML operation (auto-enrich / "Why" chip / pure-macro).

---

## 9. Quick-Start Checklist for a New App

When Cesar or any QDT engineer stands up a new Amira-built app that needs QDL data:

1. [ ] **Decide pattern A (CSV) or B (JSON)** — §3.3
2. [ ] **Get `QML_API_KEY` (or `QDL_API_KEY` + `QDL_API_TAG`) from QDT ops** — put in `.env`, never git
3. [ ] **Pick dictionary approach** — hard-coded curated map (§4.2, FinIQ style) vs. full DuckDB load of the 113k-row CSV (§4.1, Quantum AI style)
4. [ ] **Write the fetch client** — copy `qml-client.ts` (TS) or the `_fetch_timeseries_impl` section of `qml.py` (Python). 50–100 lines.
5. [ ] **Add caching** — per-`(symbol,provider,t1,t2)` key, 4h TTL default
6. [ ] **Add per-call logging** — URL with masked key, elapsed ms, HTTP status, row count. Non-negotiable.
7. [ ] **Add startup health check** — one fetch against a known-good symbol at boot, log `OK` or `FAILED — <reason>`
8. [ ] **If LLM-driven**: two-pass pattern (§5.1). Never let the LLM pick symbols directly from a list > ~30 entries.
9. [ ] **Write a golden-query suite** — 3–5 queries the app should return non-empty data for. Run nightly. Alert on drift.
10. [ ] **Document which tags / symbols the app relies on** in its own README — so the next person (or the drift-detection agent) knows what to watch.

---

## 10. Open Questions for QDT Ops

If Cesar's team is planning a platform-level QDL integration for Amira, these need answers:

- [ ] **Shared catalog service?** Is the 113k-row dictionary going to live per-app or be centralized behind an Amira platform API? (Recommendation: centralize.)
- [ ] **Rate limits** — per key, per app, per tag? Currently unknown in our code — we just add timeouts and retries.
- [ ] **Auth rotation policy** — how often does `QML_API_KEY` rotate, who notifies consumers?
- [ ] **Pattern B tag semantics** — `QDL_API_TAG` is passed on every call in the Python client but we don't know how it routes. Ask QDT ops.
- [ ] **Governance** — `authorized_groups` — who sets which groups Mars users fall into? Who enforces (Amira platform, per app, or QDL edge)?

---

*Maintained by Farzaneh (farzaneh@qdt.ai) as part of the Amira FinIQ project. Update whenever our QDL integration pattern changes.*
