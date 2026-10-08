# 0001 — Record architecture decisions

* Status: accepted
* Deciders: Steven
* Date: 2026-10-08

## Context and Problem Statement

`personal-agent` is design-heavy. Its value is not the lines of code — much of the
behaviour comes from configuration of an existing agent harness — but the choices about
identity, storage, memory, safety, and scope. Those choices were made in discussion, and
the reasoning behind them is not currently preserved anywhere. `docs/DESIGN.md` records
what the design *is*, but not why the alternatives were rejected.

This matters here more than in a typical project for two reasons. The project is partly
pedagogical, and it is intended to be presented publicly as a demonstration of how Steven
works. In both cases, the decision rationale *is* the artifact of interest. Without a
record, rejected options get relitigated, and the public demo shows outcomes without
showing judgement.

How should decision rationale be captured?

## Decision Drivers

* Preserve rationale, not just outcomes — specifically the rejected alternatives and
  their tradeoffs.
* Serve as demonstration material: the reasoning should be presentable on its own.
* Low ceremony, single maintainer. A process that is expensive to follow will not be
  followed.
* Must support supersession, so a reversed decision leaves a trace rather than
  disappearing.
* Should not become a second, competing description of the current design.

## Considered Options

* Architecture Decision Records in the repository, MADR template
* Architecture Decision Records in the repository, Nygard template
* Keep rationale as prose inside `docs/DESIGN.md`
* Store decisions in the Obsidian vault or another external location
* Do nothing; rely on session history

## Decision Outcome

Chosen option: "Architecture Decision Records in the repository, MADR template", because
it is the only option that preserves alternatives structurally while staying cheap enough
for a single maintainer to sustain, and it fits the project's pedagogical intent.

Convention details are in [`README.md`](./README.md): directory `adr/`, files
`NNNN-imperative-verb-phrase.md`, status vocabulary
`proposed | accepted | rejected | deprecated | superseded by ADR-NNNN`.

The MADR template was chosen over Nygard's shorter one because this project's decisions
are typically choices among alternatives with real tradeoffs — agent directory versus
project configuration, private data in-repo versus outside it, daily versus continuous
sessions, generated atlas versus a database, reversibility versus permission prompts.
Nygard's Context/Decision/Consequences shape is more compact but pushes the rejected
options into prose, and the rejected options are the part with the most durable value.

### Positive Consequences

* Rejected options and their tradeoffs are recorded, which is what prevents the same
  debate recurring.
* The decision log is directly reusable as public demonstration material.
* Supersession chains leave an auditable history of direction changes.
* Rationale is greppable and lives beside the code it explains.

### Negative Consequences

* Ceremony: every substantive change now has a write-up step, which will sometimes lag
  behind implementation.
* Two artifact types exist and must not be confused. This is mitigated by the explicit
  division of responsibility in `README.md`: `docs/DESIGN.md` describes the present,
  `adr/` explains the past.
* Some decisions will be recorded retroactively, which is lower fidelity than recording
  them at the time.

## Pros and Cons of the Options

### ADRs in-repo, MADR

* Good, because alternatives and tradeoffs are first-class sections rather than prose.
* Good, because numbering makes supersession links resolvable.
* Good, because markdown files in git need no new tooling and survive any future
  migration.
* Bad, because MADR is verbose if the optional sections are not pruned.

### ADRs in-repo, Nygard

* Good, because it is short enough that writing one is never a burden.
* Good, because it is the most widely recognised ADR shape.
* Bad, because there is no natural home for considered options; they end up buried in
  Context, which is where rationale most often gets lost.

### Rationale as prose in `docs/DESIGN.md`

* Good, because there is exactly one document and no synchronisation problem.
* Bad, because design updates overwrite history — the document converges on the current
  state and the rejected options are edited away.
* Bad, because a single large document cannot answer "when and why did this change?"

### External location (Obsidian vault, wiki)

* Good, because it is already part of an existing note-taking habit.
* Bad, because the record drifts from the code and stops being read at the moment it is
  needed — while working in the repository.
* Bad, because it cannot be published alongside the project without a second copy.

### Do nothing; rely on session history

* Good, because it requires no effort and pi already stores sessions as JSONL.
* Bad, because session history is episodic, not thematic: rationale is scattered across
  conversations, mixed with unrelated work, and lost to compaction.
* Bad, because it is unreadable to anyone but the person who was in the conversation,
  which defeats the public demonstration goal.

## Links

* [Architecture decision record resources](https://github.com/architecture-decision-record/architecture-decision-record)
* [`docs/DESIGN.md`](../docs/DESIGN.md) — the current design
* [`adr/README.md`](./README.md) — the convention and decision log index
