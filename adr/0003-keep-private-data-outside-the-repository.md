# 0003 — Keep private data outside the repository

* Status: accepted
* Deciders: Steven
* Date: 2026-10-08

## Context and Problem Statement

The agent accumulates private material: session transcripts containing project details,
a memory file containing personal facts and preferences, journal entries, briefings, a
mutation log, and undo snapshots. The repository is intended to be **public** as a
demonstration of how Steven works. Where should the private data live?

The project brief requires data to be stored locally, avoiding cloud or remote storage —
so the answer is not "a bucket" or "someone else's database". The realistic options are
all local filesystem layouts.

## Decision Drivers

* The repository is public; private data must never be publishable by accident.
* Local-only storage is a stated requirement.
* The blast radius of a mistake should be structural, not procedural. A single
  `git add -f`, `git clean -xdf`, or `git bundle` should not be able to leak the journal.
* The layout should remain simple to reason about and to publish.

## Considered Options

* Data outside the repository, at `~/personal-agent-data`
* Data in `data/` inside the repository, excluded by `.gitignore`
* Data inside a Dropbox folder
* Data in a remote or cloud store

## Decision Outcome

Chosen option: "Data outside the repository, at `~/personal-agent-data`", because
separation of the data from the repository makes leakage a filesystem impossibility
rather than a correctness property of a `.gitignore` file.

`bin/pa` sets `PA_DATA_DIR` (default `~/personal-agent-data`) and derives
`PI_CODING_AGENT_SESSION_DIR`, memory, atlas, briefs, journal, undo, and snapshot paths
from it. `.gitignore` rules and a pre-commit hook are still applied, but as defense in
depth rather than as the primary control.

The complementary rule is: **structure in the repository, personal facts in the data
directory.** `agent/AGENTS.md` describes the shape of the world — corpus paths,
conventions, output formats — and is publishable. `$PA_DATA_DIR/memory/USER.md` holds who
Steven is and what he is currently prioritising, and never leaves the machine.

### Positive Consequences

* Accidental publication requires a deliberate path change, not a forgotten ignore rule.
* The repository can be published and screenshotted without redaction of the working tree.
* `git clean`, `git add -f`, and `git bundle` cannot touch private data.
* The data directory can be backed up, encrypted, or relocated independently of the repo.

### Negative Consequences

* The layout is split across two roots, so "where does this file live?" is a question that
  must be answered by convention rather than by looking in one place.
* A path carrying `~` is not portable between machines without setting `PA_DATA_DIR`.
* The data directory is outside Dropbox and there is currently no Time Machine
  destination, so it has **no backup**. This is an accepted, tracked risk rather than an
  oversight — see `docs/DESIGN.md` §7.3.
* Git-based history of the agent's own state (memory evolution, journal) requires a
  separate local-only repository if it is wanted at all.

## Pros and Cons of the Options

### Outside the repository

* Good, because the failure mode is "cannot publish" rather than "published".
* Good, because it satisfies the local-only requirement with no cloud dependency.
* Bad, because it introduces a second root and an environment variable.

### In-repo `data/` with `.gitignore`

* Good, because everything lives in one place and is easy to find.
* Good, because relative paths work without environment variables.
* Bad, because the safety property depends on a text file staying correct forever. Every
  new subdirectory needs a rule; one `git add -f` or a new nested path defeats it.
* Bad, because once published, removal is not possible — forks, caches, and archives
  persist it. For a public repository this is the decisive argument.

### Dropbox folder

* Good, because it is already synced and backed up.
* Bad, because it contradicts the local-only requirement.
* Bad, because Dropbox on this machine is a macOS File Provider; see
  [ADR-0008](./0008-keep-git-out-of-dropbox.md) for why that matters mechanically.
* Bad, because syncing high-churn session transcripts generates constant upload traffic.

### Remote or cloud store

* Bad, because the local-only requirement rules it out, and no benefit is gained over a
  local directory.

## Links

* [`docs/DESIGN.md`](../docs/DESIGN.md) §3 — layout, §7.2 — private-path protection
* [ADR-0008](./0008-keep-git-out-of-dropbox.md) — git and Dropbox interaction
* `docs/DESIGN.md` §7.3 — the unresolved backup question
