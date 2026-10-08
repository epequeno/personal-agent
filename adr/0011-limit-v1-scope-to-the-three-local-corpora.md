# 0011 — Limit v1 scope to the three local corpora

* Status: accepted
* Deciders: Steven
* Date: 2026-10-08

## Context and Problem Statement

The stated purpose is a "project manager / personal assistant" with a bird's-eye view of
Steven's work. That view could be drawn at very different scopes:

* the three local directories named in the brief;
* those three plus EAP business state — the CRM pipeline, leads, clients, revenue;
* those three plus external systems such as GitHub, email, and a calendar;
* a single corpus, done deeply.

The EAP business is a live concern with its own documentation, its own roadmap, and a
planned AI Operations Agent (CRM Phase 10) that is explicitly designed to reason over
business state. There is a real risk of duplicating that work badly here.

## Decision Drivers

* The brief asks for one job done well, not a broad shallow assistant.
* EAP business state is already served by `_Home.md`, the EAP roadmap, and the CRM docs;
  Phase 10 is designed to cover pipeline reasoning properly, with real data access.
* The three corpora are local files. Nothing in this design requires credentials, network
  access, or a service.
* A narrower surface makes the reversibility guarantees in
  [ADR-0005](./0005-optimize-for-reversibility-over-permission-prompts.md) tractable.
* Widening scope later is easier than narrowing it after behaviour has been built around it.

## Considered Options

* The three local corpora only
* Three corpora plus EAP business state
* Three corpora plus external sources (GitHub API, email, calendar)
* One corpus, done deeply

## Decision Outcome

Chosen option: "The three local corpora only", because it is the scope the brief actually
names, and the broader option duplicates work that Phase 10 exists to do.

In scope: `~/code`, `~/Dropbox/eapsoftware-research`, `~/Dropbox/obsidian/Personal`.

Out of scope for v1: live CRM data, the lead pipeline, email, calendars, and any network
API. EAP is represented only through its local documents — its roadmap, its CRM phase
notes, and its place in `_Home.md`.

The escape hatch is explicit: widening to a fourth corpus is a configuration change to
`agent/AGENTS.md` and an atlas path, not a redesign.

### Positive Consequences

* No credentials, no network dependency, no rate limits, no external failure modes.
* Every claim the agent makes is traceable to a local file.
* The tool surface stays small, consistent with
  [ADR-0010](./0010-curate-the-extension-loadout.md).
* Behaviour is reproducible: the same corpora produce the same answers.
* It does not compete with Phase 10, and can instead prototype patterns Phase 10 will need.

### Negative Consequences

* The agent cannot answer questions about the actual business — current leads, real
  pipeline health, actual revenue — which is arguably the most interesting version of
  "what should I focus on".
* EAP's local documentation is known to be stale (its roadmap header reads
  "last updated 2026-03-15"), so the agent's EAP view is only as good as those files.
* "Cross-project PM" over a corpus that excludes the business means the two most
  consequential domains — income and job search — are represented only as documents
  someone else wrote.
* The boundary will be tested: questions will naturally stray into pipeline or email
  territory, and the agent must decline cleanly rather than speculate.

## Pros and Cons of the Options

### Three local corpora only

* Good, because it matches the brief exactly and needs no new access.
* Good, because it keeps the whole design local, inspectable, and reproducible.
* Bad, because it omits the domain where project management has the highest stakes.

### Plus EAP business state

* Good, because it would make the agent answer the questions Steven most wants answered.
* Bad, because it requires AWS and DynamoDB access, credentials, and a mutable production
  system — a completely different risk profile from writing files.
* Bad, because Phase 10 is designed for exactly this, with human-in-the-loop confirmation
  and an audit trail; a parallel implementation here would be an inferior duplicate.
* Bad, because it would make the agent's output non-reproducible and untestable locally.

### Plus external sources

* Good, because GitHub activity, email, and calendar are rich signals for prioritisation.
* Bad, because each adds authentication, rate limits, privacy considerations, and a
  failure mode that has nothing to do with the agent's actual logic.
* Bad, because it is a large amount of integration work before the core loop is proven.

### One corpus, deeply

* Good, because depth may beat breadth — most urgent questions may concern `~/code` alone.
* Bad, because it discards the cross-corpus insight that motivates the project: connecting
  a research finding to a repository to a personal note.
* Bad, because the three corpora differ enough in structure that a deep single-corpus
  design would not generalise when the others are added.

## Links

* [`docs/DESIGN.md`](../docs/DESIGN.md) §1 — non-goals, §11 O3
* [ADR-0005](./0005-optimize-for-reversibility-over-permission-prompts.md) — the surface being protected
* [ADR-0012](./0012-treat-the-priorities-hub-as-a-verified-claim.md) — how EAP state is reached indirectly
* `~/code/eap-software/docs/eap-software/CRM/10 - AI Operations Agent.md` — the separate Phase 10 effort
