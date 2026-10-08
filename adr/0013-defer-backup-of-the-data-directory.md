# 0013 — Defer backup of the data directory

* Status: accepted
* Deciders: Steven
* Date: 2026-10-08

## Context and Problem Statement

[ADR-0003](./0003-keep-private-data-outside-the-repository.md) placed the agent's private
state at `~/personal-agent-data`, deliberately outside Dropbox. There is also no Time
Machine destination configured on this machine. As a result the data directory has no
backup, which was recorded as an open item.

Backup is not urgent today because the directory does not exist yet and holds nothing.
Deciding the full backup strategy now would delay the work that creates anything worth
backing up. But leaving it undecided risks it being forgotten.

## Decision Drivers

* Nothing of value exists yet, so the risk today is zero.
* The stated requirement is local-only storage; cloud destinations are ruled out.
* Backup is additive and can be retrofitted without changing the data layout.
* An undecided item is easy to forget; a dated decision with an explicit trigger is not.
* Storage decisions made under pressure to start work tend to be the wrong ones.

## Considered Options

* Defer, with an explicit trigger for revisiting, and local-only as the chosen direction
* Configure Time Machine now
* A local-only git repository for the data directory
* An encrypted archive copied to Dropbox

## Decision Outcome

Chosen option: "Defer, with an explicit trigger for revisiting, and local-only as the
chosen direction."

When backup is revisited, the answer is local-only: Time Machine, and a local-only git
repository for `journal/` and `memory/` if per-change history is wanted. Cloud or encrypted
remote copies are out, consistent with the local-only requirement.

**Revisit trigger:** when `$PA_DATA_DIR` contains material that would be costly to lose —
specifically a populated `memory/` and more than a few weeks of `journal/`. Not before.

### Positive Consequences

* Nothing blocks the work that makes the decision matter.
* The direction is recorded, so revisiting is a decision about *when*, not *what*.
* No premature infrastructure.

### Negative Consequences

* **Accepted risk:** if the disk fails before the trigger is reached, `memory/` and
  `journal/` are lost permanently. They are not derivable from anything else.
* Undated staleness is avoided, but the trigger is a judgement call and may be passed
  without being noticed.

Note the asymmetry that makes this acceptable: the corpora themselves are unaffected by a
disk failure — they live in Dropbox and on GitHub. The `atlas/` is regenerable from them.
Only `memory/` and `journal/` are uniquely irreplaceable, and they will be small and young
for some time.

## Links

* [ADR-0003](./0003-keep-private-data-outside-the-repository.md) — why data is outside the repository
* [ADR-0008](./0008-keep-git-out-of-dropbox.md) — why Dropbox is not the answer
* [`docs/DESIGN.md`](../docs/DESIGN.md) §7.3
