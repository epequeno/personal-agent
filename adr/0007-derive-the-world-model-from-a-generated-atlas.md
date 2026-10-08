# 0007 — Derive the world model from a generated atlas

* Status: accepted
* Deciders: Steven
* Date: 2026-10-08

## Context and Problem Statement

The agent's job is project management across three corpora: roughly 58
directories in `~/code`, roughly 50 project directories plus a `paper-watch` directory of
197 files in `~/Dropbox/eapsoftware-research`, and `~/Dropbox/obsidian/Personal`. Questions
like "what is the state of X" and "what should I work on" require a view across all of it.

Building that view is the central retrieval problem of this project. What should the
world model be?

## Decision Drivers

* The corpus is large in project count but small in bytes, and changes slowly.
* No infrastructure should be required to answer the common questions.
* Retrieval must be inspectable: when the agent says a project is stale, the basis should
  be visible and arguable.
* Regeneration should be deterministic and cheap — ideally free, with no model calls.
* pi already ships strong text search through the `pi-fff` package (`grep`, `find_files`,
  `fff_multi_grep`), so the marginal value of an index is not obvious.
* Prior research in the vault concludes "don't build a custom DB from scratch."

## Considered Options

* A deterministic generated atlas, with grep as the escalation
* A local SQLite FTS5 index built over the corpora
* A vector index with embeddings for semantic retrieval
* An external memory server (agentmemory) for hybrid retrieval
* No world model: read files on demand for each question

## Decision Outcome

Chosen option: "A deterministic generated atlas, with grep as the escalation", because it
answers the large majority of project-management questions with no infrastructure, no model
calls, and a visible basis for every claim.

A `pa-atlas` script walks the three corpora and emits:

* `atlas/index.md` — one line per project: name, corpus, last activity, roadmap completion,
  open item count, flags.
* `atlas/<slug>.md` — a card per project: last commit or modification time, next roadmap
  items, open TODOs, note links, recent sessions, size.

Retrieval order for any question:

```
atlas card  →  grep corpus  →  chat-history skill  →  memory
```

The escalation path is explicit and deferred: FTS5, then hybrid retrieval, then
agentmemory, but only if grep measurably falls short. This is planned as M5, not built now.

### Positive Consequences

* Zero infrastructure: no database, no embeddings, no service, no dependencies.
* Fully deterministic — the same corpus produces the same atlas, so differences between
  runs reflect real changes rather than model variance.
* Every claim is traceable: the atlas entry shows which file or commit it came from.
* Regeneration is free and can run on every scheduled brief.
* The atlas is ephemeral and regenerable, so it is never authoritative and cannot drift
  into being a second source of truth.

### Negative Consequences

* **No semantic retrieval.** A question phrased differently from the underlying filenames
  or note titles will not match. "Which project is about measuring agent memory loss"
  depends on the words "memory" and "loss" appearing somewhere findable.
* The atlas is stale between regenerations, and staleness is invisible unless the
  generation time is surfaced.
* Quality depends on naming and structural conventions across the corpora. The roughly 23
  non-repository directories in `~/code` are heterogeneous, so their cards will be uneven.
* It does not scale: beyond a few hundred projects, the index becomes too large to inject
  and the approach needs the FTS5 escalation.
* A generated atlas can only report what is mechanically visible. It cannot know *why*
  something is parked or which project is the current priority — see
  [ADR-0012](./0012-treat-the-priorities-hub-as-a-verified-claim.md).

## Pros and Cons of the Options

### Generated atlas plus grep

* Good, because it needs nothing beyond a script and the search tools already present.
* Good, because it is inspectable and arguable in a way a similarity score is not.
* Good, because it is trivially cheap to regenerate and therefore always fresh enough.
* Bad, because it fails on conceptual queries that do not share vocabulary with the files.

### SQLite FTS5 index

* Good, because it gives ranked full-text search with stemming, over content rather than
  filenames, and handles a much larger corpus.
* Good, because SQLite is one local file, so the local-only requirement holds.
* Bad, because it introduces a build step and a staleness problem of its own — the index
  must be rebuilt as the corpora change.
* Bad, because the same result is largely available today via `grep` over a corpus this
  small, so the added machinery buys little at this size.

### Vector index with embeddings

* Good, because it directly addresses the semantic-query weakness.
* Bad, because it requires an embedding provider — either a model call, which contradicts
  the free-and-deterministic property, or a local model, which adds a dependency and its
  own runtime.
* Bad, because similarity scores are not inspectable: a wrong retrieval cannot be argued
  with, only observed.
* Bad, because it is the largest amount of machinery for the smallest incremental gain at
  this corpus size.

### agentmemory hybrid retrieval

* Good, because it is the most capable option and is already researched.
* Bad, because it requires a server process and database for a corpus measured in
  megabytes.
* Bad, because it is designed around automatic hook-driven capture, which
  [ADR-0006](./0006-store-durable-facts-as-file-based-memory.md) rejects for v1.

### No world model

* Good, because it is the least work and cannot be stale.
* Bad, because cross-project questions are the stated purpose of the agent. Without a
  world model every such question becomes a broad search, which is slower, more expensive,
  and inconsistent between runs.

## Links

* [`docs/DESIGN.md`](../docs/DESIGN.md) §5 — world model and retrieval order
* [ADR-0006](./0006-store-durable-facts-as-file-based-memory.md) — the semantic tier
* [ADR-0012](./0012-treat-the-priorities-hub-as-a-verified-claim.md) — what mechanical derivation cannot know
* M2 and M5 in `ROADMAP.md`
