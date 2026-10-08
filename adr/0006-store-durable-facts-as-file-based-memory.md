# 0006 — Store durable facts as file-based memory

* Status: accepted
* Deciders: Steven
* Date: 2026-10-08

## Context and Problem Statement

pi has no cross-session semantic memory. It has session transcripts, which are episodic,
scoped to a working directory, and lossy under compaction — and
[ADR-0004](./0004-use-daily-sessions.md) deliberately shortens sessions further, which
makes the gap urgent rather than theoretical. An agent that forgets every preference and
decision at midnight is not a personal assistant.

How should durable facts be stored?

Prior research exists in the vault
(`Dropbox/eapsoftware-research/persistent-memory-systems-research.md`) covering Hermes's
built-in flat-file memory, Hermes's SQLite `fact_store`, agentmemory's hook-driven
four-tier consolidation, MemGPT, and Generative Agents. Its own conclusions include
"don't build a custom DB from scratch" and that automatic capture is where the field
becomes muddled.

## Decision Drivers

* Reliability over capability: a memory that is wrong or stale is worse than none.
* The agent must be inspectable and hand-editable — Steven must be able to read and correct
  what the agent believes about him without going through the agent.
* No service, database, or background process for v1.
* Prompt-cache stability: injecting memory must not invalidate the cached prefix on every
  write.
* Prior research indicates automatic extraction is the least trustworthy part of every
  system examined.

## Considered Options

* File-based `MEMORY.md` and `USER.md`, with a tool for explicit edits and a frozen
  per-session snapshot
* Automatic capture from day one, via hooks that compress observations into facts
* An external memory server (agentmemory via MCP)
* A local SQLite fact store with FTS5 retrieval
* Rely on session search alone, writing nothing durable

## Decision Outcome

Chosen option: "File-based `MEMORY.md` and `USER.md`, with a tool for explicit edits and a
frozen per-session snapshot", because it is the smallest mechanism that is fully
inspectable, hand-editable, and cannot silently drift.

Mechanics: `§`-delimited entries; hard character ceilings (roughly 2200 for memory, 1375
for user) to force compactness; atomic writes via temp file and rename; substring matching
to identify entries for replace and remove. Memory is injected through
`before_agent_start` prompt sections, taking a **frozen snapshot** at session start so
that mid-session writes update disk without mutating the current session's injected copy.
A `session_end` hook appends a cycle summary to the journal and **proposes** zero to three
durable facts for confirmation.

### Positive Consequences

* The contents are plain text: readable, greppable, diffable, and editable without the
  agent's involvement.
* Hard character ceilings force the memory to stay compact and relevant; there is no path
  to unbounded growth.
* The frozen snapshot keeps the prompt prefix stable within a session, so writes do not
  cause cache misses.
* No service, port, database, or dependency is introduced.
* Because capture is proposed rather than automatic, a wrong fact is a visible mistake
  rather than silent corruption.

### Negative Consequences

* Curation is a real burden and it will sometimes not happen. An agent that never proposes
  facts is no better than one with no memory.
* Character ceilings mean information is deliberately dropped. There is no way to keep
  everything, so judgment about what matters is required — and the agent's judgment may be
  wrong.
* No semantic retrieval: recall is by literal substring, so a fact phrased differently
  from the query may not be found.
* `MEMORY.md` becomes authoritative by convention. A stale or incorrect entry will be
  injected into every session until noticed, and nothing detects the staleness.
* The frozen snapshot means a fact written now is not visible to the current session,
  which can read as the agent ignoring what it was just told.

## Pros and Cons of the Options

### File-based memory with frozen snapshot

* Good, because it is transparent and cheap, and fails visibly.
* Good, because it is exactly the mechanism the prior research identified as a solid
  foundation rather than a compromise.
* Good, because the character ceiling is a feature: it forces the agent to prioritise.
* Bad, because it relies on discipline that a single-user setup may not supply.

### Automatic capture from day one

* Good, because it removes the curation burden entirely.
* Bad, because every system examined does automatic extraction with heuristics or model
  calls that produce noisy facts. Hermes's `fact_store` requires a trust score and an
  asymmetric penalty precisely because extraction is unreliable.
* Bad, because a wrong fact written automatically is injected into every subsequent
  session, and the failure is silent — the agent simply starts believing something false.
* Bad, because it is significantly more work to build and tune than the problem warrants
  at this stage.

### External memory server (agentmemory)

* Good, because it is feature-rich: hybrid BM25, vector, and graph retrieval with
  reciprocal-rank fusion, and a mature MCP surface.
* Bad, because it introduces a server process, a database, and a large tool surface — for a
  single-user, single-machine agent whose entire corpus is measurable in megabytes.
* Bad, because it does not satisfy the inspectability requirement: the agent's beliefs
  would live in a KV store rather than a file Steven can open.
* Bad, because hook-based capture depends on hook coverage the agent does not have.

### Local SQLite fact store with FTS5

* Good, because it gives structured query and full-text search over facts, and scales
  beyond what flat files can.
* Good, because SQLite is a single local file, so the local-only requirement holds.
* Bad, because nothing in a three-corpus personal corpus is large enough to need it.
* Bad, because it is not hand-editable, which is the property that matters most here.

### Session search only

* Good, because it requires no new mechanism and pi already stores the transcripts.
* Bad, because recall is per-project and per-session, so a preference expressed while
  working in one repository is invisible while working in another.
* Bad, because compaction and daily rollover both discard the context needed to interpret
  a retrieved fragment.

## Links

* [`docs/DESIGN.md`](../docs/DESIGN.md) §6.1 — memory tiers
* `Dropbox/eapsoftware-research/persistent-memory-systems-research.md` — prior survey of Hermes, agentmemory, MemGPT
* [ADR-0004](./0004-use-daily-sessions.md) — why this tier is load-bearing
* M5 in `ROADMAP.md` — the escalation path if this proves insufficient
