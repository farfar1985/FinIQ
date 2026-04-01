# Semantic Layer — README

## Structure

```
semantic-layer/
├── _global.yaml              # Catalog config, join paths, guardrails, fiscal calendar, org context
├── views/
│   ├── finiq_vw_pl_unit.yaml              # P&L by unit (primary query target)
│   ├── finiq_vw_pl_brand_product.yaml     # P&L by brand/product
│   └── finiq_vw_ncfo_unit_and_anomaly.yaml # NCFO + anomaly detection
├── tables/
│   ├── fact_tables.yaml       # All 5 fact tables (financial, financial_cons, financial_base, replan, replan_cons)
│   └── dimension_tables.yaml  # All 12 dimension/reference/bridge tables
└── README.md                  # This file
```

## How This Works

The YAML files are the **source of truth**. They are maintained by humans (data engineers, the QDT team) and versioned in git. Each table/view entry has two sections:

### `discovery` — For finding the right table

Natural language descriptions of what each table answers. These get embedded as vectors in the vector store. When a user asks "what is the revenue for Pet Nutrition?", the retrieval pipeline finds `finiq_vw_pl_unit` because its discovery section lists "revenue" and "P&L" as things it answers.

The `answers_questions` list is particularly important — it contains example natural language questions that each table can answer. The `do_not_use_for` list prevents the agent from choosing the wrong table.

### `sql_context` — For generating correct SQL

Column definitions, types, join keys, filter requirements, safe query patterns, dangerous patterns, and business logic. Once the agent knows which table to use (via discovery), it retrieves the sql_context to generate the actual query.

These are embedded separately because the discovery embedding needs to match against natural language questions, while the sql_context embedding needs to match against technical query-building needs. Different semantic spaces.

## Dual Embedding Strategy

For each table/view, the build step produces two vector embeddings:

### Embedding 1: Discovery Vector
**Input text:** Concatenation of `discovery.summary` + `discovery.answers_questions` (joined as natural text)
**Purpose:** Matches against user's natural language questions
**Retrieved when:** The agent needs to decide which table(s) to query
**Example match:** User asks "compare margins across GBUs" → retrieves finiq_vw_pl_unit

### Embedding 2: SQL Context Vector
**Input text:** Concatenation of `sql_context.columns` (serialized) + `sql_context.safe_query_patterns` + `sql_context.dangerous_patterns` + relevant join paths from _global.yaml
**Purpose:** Provides the agent with everything needed to write correct SQL
**Retrieved when:** The agent has selected a table and needs to generate the query
**Example match:** Agent is building a query against finiq_vw_pl_unit → retrieves column definitions, filter requirements, example SQL, and warnings

## Build Step

The build step (you implement this) reads the YAML files and produces:

1. **JSON index** — Structured, machine-readable version of all semantic layer entries for programmatic access
2. **Discovery embeddings** — One vector per table/view, stored in the vector store with metadata (table_name, schema, risk_level)
3. **SQL context embeddings** — One vector per table/view, stored with metadata
4. **Global context chunk** — The guardrails, join paths, and fiscal calendar from _global.yaml, stored as a retrievable document that gets appended to any SQL generation context

```python
# Pseudocode for the build step
for yaml_file in glob("**/*.yaml"):
    entries = parse_yaml(yaml_file)
    for entry in entries:
        # Discovery embedding
        discovery_text = f"{entry.discovery.summary} {' '.join(entry.discovery.answers_questions)}"
        discovery_vector = embed(discovery_text)
        vector_store.upsert(
            id=f"discovery:{entry.table_name}",
            vector=discovery_vector,
            metadata={"table_name": entry.table_name, "type": "discovery", "risk_level": entry.risk_level}
        )

        # SQL context embedding
        sql_text = serialize_sql_context(entry.sql_context)
        sql_vector = embed(sql_text)
        vector_store.upsert(
            id=f"sql_context:{entry.table_name}",
            vector=sql_vector,
            metadata={"table_name": entry.table_name, "type": "sql_context"}
        )

# Global context (always retrieved alongside SQL context)
global_config = parse_yaml("_global.yaml")
global_text = serialize_global(global_config)
vector_store.upsert(
    id="global:guardrails_and_joins",
    vector=embed(global_text),
    metadata={"type": "global", "always_include": True}
)
```

## Retrieval Flow in the Platform

When a user asks a question:

1. **Discovery retrieval:** Embed the user's question → find top-3 matching discovery vectors → these are the candidate tables
2. **SQL context retrieval:** For each candidate table, retrieve its sql_context vector → this gives the agent columns, types, joins, and example queries
3. **Global context:** Always append the guardrails and relevant join paths from _global.yaml
4. **Agent generates SQL** using all retrieved context (typically 3-5K tokens total)

## Maintenance

When the schema changes (new tables, new columns, renamed fields):

1. Update the relevant YAML file
2. Run the build step to regenerate embeddings
3. The agent immediately starts using the updated schema on the next query

When new query patterns emerge (via the Query Intelligence Agent):

1. If a materialized view is created, add a new YAML entry for it
2. Run the build step
3. The agent discovers and prefers the new view automatically
