# 0004 — Use daily sessions

* Status: accepted
* Deciders: Steven
* Date: 2026-10-08

## Context and Problem Statement

A personal assistant should feel continuous — it should remember what it did yesterday.
pi provides that continuity through sessions, which are JSONL transcripts scoped to a
working directory, resumable by id or with `--continue`. But pi also compacts long
sessions, and compaction is lossy: this is precisely the failure mode that the
`agent-fail-eval` research project measures.

So the continuity mechanism is also the mechanism that degrades it. What session model
should the agent use?

## Decision Drivers

* Context window and cost grow with session length; a daily PM agent runs every day.
* Continuity must survive across sessions, not merely within one.
* Sessions should be easy to locate and reason about after the fact.
* The launch behaviour should be deterministic — "run `pa`" should always do the same
  thing, without requiring the user to decide whether to resume.
* Prerequisite: pi's `--session-id` opens an existing session by id or creates it if
  absent, which makes a date-derived id behave as a natural daily rollover.

## Considered Options

* Daily sessions with a date-derived id (`pa-YYYY-MM-DD`)
* One continuous home session, resumed with `--continue`
* A session per topic or per project
* No persistence (`--no-session`)

## Decision Outcome

Chosen option: "Daily sessions with a date-derived id", because it bounds context growth,
makes launch deterministic, and produces a naturally indexed history — at the cost of
making cross-session memory load-bearing rather than optional.

`bin/pa` passes `--session-id "pa-$(date +%F)"`. Resuming is implicit: running `pa` again
on the same day continues that day's session; running it tomorrow starts a fresh one.

### Positive Consequences

* Context per session is bounded by a day's work, so compaction is unlikely to be reached
  and its losses are small when it is.
* Launch is deterministic and requires no decision from the user.
* Sessions are self-indexing by date, which makes the episodic layer searchable without
  any additional metadata.
* Cost is predictable: a long-running session cannot silently accumulate a large context.

### Negative Consequences

* **This decision makes the memory tier load-bearing.** With no session carrying over,
  anything the agent should remember tomorrow must be written to `$PA_DATA_DIR/memory`
  today, and re-injected on the next session start. Until
  [ADR-0006](./0006-store-durable-facts-as-file-based-memory.md) is implemented, the agent
  is effectively amnesiac across days.
* Continuity is coarser than it needs to be: work that spans midnight or a weekend is
  split, and the agent must reconstruct the thread from memory and journal.
* The date-derived id couples session identity to the local clock. Timezone changes or a
  clock adjustment can produce an unexpected new session.
* Many small sessions accumulate faster than a few large ones, so the episodic store grows
  in file count even as each file stays small.

## Pros and Cons of the Options

### Daily sessions

* Good, because context growth and cost are bounded by construction.
* Good, because it needs no new machinery — `--session-id` already does the rollover.
* Good, because the failure mode is graceful: a missed day just means a new session.
* Bad, because it converts "remember things" from an emergent property of a long session
  into an explicit feature that must be built and maintained.

### One continuous home session

* Good, because continuity is free and the agent genuinely accumulates context.
* Good, because there is one artifact to search when reconstructing history.
* Bad, because context grows without bound in the normal case, and compaction begins
  silently discarding the earliest turns — including potentially the constraints and
  preferences that matter most.
* Bad, because every launch is slower and more expensive than the last.
* Bad, because a corrupted or mis-forked session takes the whole history with it.

### Session per topic or project

* Good, because it matches how the corpora are already organised, and reads naturally for
  project-scoped questions.
* Bad, because it requires deciding the topic before starting, which is a tax on the most
  common case — a general "what should I work on" question that spans projects.
* Bad, because pi scopes sessions by working directory already, which produces much of this
  benefit for free when the agent is invoked with `--here`.

### No persistence

* Bad, because it discards the episodic layer entirely, which is the only record of what
  happened on a given day and the cheapest source of project history.

## Links

* [`docs/DESIGN.md`](../docs/DESIGN.md) §4 — session model
* [ADR-0006](./0006-store-durable-facts-as-file-based-memory.md) — the memory tier this decision depends on
* [ADR-0012](./0012-treat-the-priorities-hub-as-a-verified-claim.md) — how prior state is reconstructed
