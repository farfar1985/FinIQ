---
name: Rajiv's addendum policy — incremental spec evolution
description: New data sources (Databricks, wiki) should be separate addendum documents to the base SRS, not modifications. Proves the process.
type: feedback
---

## Rajiv's directive (2026-03-25 WhatsApp, ~6:39-6:43 PM)

After the merged SRS v2.1 was shared:
1. "Let's add the databricks specs to this. And then specs from the wiki."
2. "Create them as separate addendums to this spec first. That is, feed Claude the base spec and ask it to create an addendum based on new docs."
3. "That's the process we want to prove too. (Amending specs with incremental requirements)"

## What this means
- **DO NOT modify SRS v2.1** when incorporating new data sources
- **Create separate addendum documents** that reference the base SRS
- Each new data source = new addendum (Databricks = Addendum A, Wiki/taxonomy = Addendum B, etc.)
- The addendum should specify which base SRS requirements are amended, extended, or newly added
- This demonstrates a repeatable process: base spec + incremental addenda as new information arrives

## Why Rajiv wants this
- Proves that AI-assisted spec writing can handle **incremental updates**, not just full rewrites
- Keeps the base SRS clean and stable while allowing evolution
- Creates an audit trail of what changed and why
- Demonstrates a process Mars can adopt for their own documentation workflows

**How to apply:** When new source material arrives (Databricks schema, Mars wiki, Quandl data), create a standalone addendum document (Word, same Amira styling) that references SRS v2.1 as the base and specifies amendments/additions.
