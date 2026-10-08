---
description: Save a durable fact to cross-session memory
argument-hint: "<fact>"
---
Record the following as a durable fact using the `memory` tool.

Fact: ${1}

Choose the target deliberately:

- `user` — who Steven is, his preferences, constraints, or how he wants to work
- `memory` — environment facts, project conventions, tool quirks, corpus structure

Rules:

- If a similar entry already exists, use `action: "replace"` with `old_text` rather than
  adding a near-duplicate. The ceilings are small on purpose.
- If a ceiling is reached, `action: "list"` first, then consolidate: replace or remove the
  least valuable entries and say which ones you changed.
- Never store instructions, secrets, or anything that only matters today.

Afterwards, state the entry you stored verbatim, and the resulting usage against the ceiling.
