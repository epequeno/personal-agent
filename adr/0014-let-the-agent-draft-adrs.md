# 0014 — Let the agent draft ADRs

* Status: accepted
* Deciders: Steven
* Date: 2026-10-08

## Context and Problem Statement

[ADR-0001](./0001-record-architecture-decisions.md) recorded write-up ceremony as the main
cost of adopting ADRs, and predicted that records would lag behind implementation. The
agent generating much of this project's reasoning is also the party best positioned to
draft the record of it.

That creates an obvious hazard: an agent that authors its own decision log can justify its
own choices after the fact, and the immutability and audit value of the log depends on
someone else accepting it.

Should the agent write ADRs?

## Decision Drivers

* Ceremony is the known failure mode of this convention, and it should be reduced.
* The audit value of the log depends on human acceptance, not on who types it.
* The agent has the context surrounding a decision at the moment it is made, which is when
  rationale is cheapest to capture and most accurate.
* The status vocabulary already distinguishes `proposed` from `accepted`, so a
  propose-versus-accept split needs no new mechanism.

## Considered Options

* The agent drafts with status `proposed`; Steven is the only one who accepts
* The agent authors and accepts autonomously
* Steven authors every ADR alone

## Decision Outcome

Chosen option: "The agent drafts with status `proposed`; Steven is the only one who
accepts."

Rules the agent follows:

* It **may** create new ADRs, and must set status `proposed`.
* It **must not** change a status. Only Steven sets `accepted`, `rejected`, or
  `deprecated`.
* It **must not** edit the Context or Decision sections of an accepted ADR. New information
  goes in a dated `Updates` section; a change of direction is a new superseding ADR.
* It **must not** delete, renumber, or rewrite an existing ADR.
* When a decision is made in conversation, drafting the ADR is part of finishing the work,
  not a separate task.

### Positive Consequences

* The dominant cost identified in ADR-0001 is reduced, which is what makes the convention
  sustainable for a single maintainer.
* Rationale is captured while it is fresh, rather than reconstructed later.
* Acceptance stays a human act, so the log remains a record of decisions actually taken
  rather than a record of the agent's preferences.

### Negative Consequences

* **The rule is convention, not enforcement.** Nothing mechanically stops the agent
  writing `accepted`; it relies on the prompt and on review. A future guard extension could
  check this, and is not currently planned.
* `proposed` ADRs can accumulate unreviewed, which is a quieter version of the same
  lag problem — a log full of drafts is not a decision log.
* The agent may draft an ADR for a choice that was never really a decision, producing noise
  that has to be reviewed down.
* Agent-authored prose can be fluent and plausible without being true to what was actually
  decided, so acceptance requires reading rather than skimming.

## Links

* [ADR-0001](./0001-record-architecture-decisions.md) — the convention, and the ceremony cost this addresses
* [`adr/README.md`](./README.md) — the rules restated as convention
* `ROADMAP.md` — porting the upstream ADR skill into `agent/skills/`
