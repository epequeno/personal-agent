# 0005 — Optimize for reversibility over permission prompts

* Status: accepted
* Deciders: Steven
* Date: 2026-10-08

## Context and Problem Statement

The agent is intended to act on Steven's behalf, not merely advise: commit work, tidy
roadmaps, write notes, move files. Steven's stated position is that it "should have access
to whatever it needs."

That autonomy sits badly with the state of the corpora. Two of the three are **not git
repositories** — `~/Dropbox/eapsoftware-research` and `~/Dropbox/obsidian/Personal` are
Obsidian vaults protected only by Dropbox version history. In `~/code`, only 35 of roughly
58 directories are git repositories. So for a large share of the surface the agent can
touch, there is no local undo.

How should the agent be constrained?

## Decision Drivers

* Steven explicitly does not want a permission-prompt workflow; friction defeats the
  purpose of a personal assistant.
* Large parts of the corpora have no version control, so a bad write may be unrecoverable
  by ordinary means.
* The agent will be developed and iterated on, which is exactly when bad writes are most
  likely.
* Reversibility also produces an audit trail, which is independently valuable as
  demonstration material and as a prototype for EAP CRM Phase 10's auditability
  requirement.

## Considered Options

* Reversibility layers: undo journal, daily snapshots, mutation log, outbox threshold
* Read-only access with confirmation prompts for writes
* Unrestricted trust: no guards at all
* Make the corpora safe first, by initialising git repositories in the Obsidian vaults

## Decision Outcome

Chosen option: "Reversibility layers: undo journal, daily snapshots, mutation log, outbox
threshold", because it preserves the autonomy Steven asked for while making the resulting
damage recoverable, and it produces a useful artifact rather than a control.

| Layer | Mechanism |
|---|---|
| Undo journal | A `tool_call` hook copies the before-image of any corpus file about to be written or edited into `$PA_DATA_DIR/undo/<date>/` |
| Daily snapshots | `tar` of both Obsidian vaults into `$PA_DATA_DIR/snapshots/`; retention 14 daily + 8 weekly |
| Outbox | Multi-file edits, deletions, or changes touching more than N files write a plan and diff to `$PA_DATA_DIR/outbox/` and ask once |
| Mutation log | Every corpus mutation appended to `$PA_DATA_DIR/journal/mutations.jsonl` with before and after hashes |
| Audit trail | Same record, surfaced as "what did the agent change" |

The snapshots are cheap: the two vaults total approximately 5.4 MB.

### Positive Consequences

* Autonomy is preserved with no per-action friction.
* Every corpus write is revertible from `undo/`, independently of Dropbox retention.
* Daily snapshots survive a whole day of mistakes, not just the last one.
* The mutation log answers "what changed and when" without reading transcripts, and
  doubles as demonstration material.
* The record shape is directly reusable for Phase 10's "agent reasoning is logged and
  auditable" acceptance criterion.

### Negative Consequences

* **Raw shell commands are not covered.** A `tool_call` hook sees `write` and `edit`; it
  does not see an equivalent mutation performed through `bash` (`mv`, `sed -i`, `rm`, a
  redirect). An agent that is careless with shell has an uncovered path. This is a known
  gap, not an oversight, and the mutation log only records what the hooks observed.
* If the snapshot job silently stops running, the protection degrades without any signal.
  A staleness check on `snapshots/` is needed.
* Disk usage grows with undo and snapshot retention. Acceptable at these corpus sizes, but
  the journal and undo directories are currently unbounded.
* Snapshotting is not a backup: it shares the same disk as the data it protects.

## Pros and Cons of the Options

### Reversibility layers

* Good, because it matches the stated preference for autonomy.
* Good, because it converts an unrecoverable failure mode into a recoverable one.
* Good, because the machinery is small, inspectable, and needs no service.
* Bad, because it does not cover mutations made through raw shell.
* Bad, because it is reactive: it makes damage survivable rather than preventing it.

### Read-only with confirmation prompts

* Good, because it prevents damage rather than merely recording it.
* Good, because it is trivial to implement and reason about.
* Bad, because it directly contradicts the requirement that the agent be able to act.
* Bad, because prompt fatigue is a real failure mode: a user who is asked constantly
  approves without reading, which is less safe than a working undo journal.

### Unrestricted trust

* Good, because it is zero work and maximally simple.
* Bad, because two corpora have no local version control, so an unlucky delete or
  overwrite is permanent.
* Bad, because it forfeits the audit trail, which has independent value.

### Initialise git repositories in the Obsidian vaults

* Good, because it would give real, granular, familiar version control for the vaults.
* Bad, because it puts a `.git` directory inside Dropbox, which
  [ADR-0008](./0008-keep-git-out-of-dropbox.md) establishes as harmful — Dropbox here is
  a macOS File Provider, and `.git` is exactly the high-churn, many-small-files payload
  that file providers handle badly.
* Bad, because it changes the nature of a notes vault into a repository, with attendant
  workflow expectations, without being asked for.

## Links

* [`docs/DESIGN.md`](../docs/DESIGN.md) §6.3 — reversibility layers
* [ADR-0008](./0008-keep-git-out-of-dropbox.md) — why git in the vaults is rejected
* [ADR-0011](./0011-limit-v1-scope-to-the-three-local-corpora.md) — the surface being protected
