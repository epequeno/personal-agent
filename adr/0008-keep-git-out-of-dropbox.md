# 0008 — Keep `.git` out of Dropbox

* Status: accepted
* Deciders: Steven
* Date: 2026-10-08

## Context and Problem Statement

Much of Steven's work already lives in Dropbox, and Dropbox provides sync and version
history for free. It is natural to wonder whether this repository — or the private data
directory — should live there too, since that would add backup with no new tooling.

The question is not whether Dropbox is useful but whether git tolerates it. On this
machine, `~/Dropbox` is a symlink to `~/Library/CloudStorage/Dropbox`, which means Dropbox
is a **macOS File Provider**, not a plain locally-synced directory. That distinction is the
whole problem.

## Decision Drivers

* git depends on atomic `rename()` and `fsync` semantics for correctness, and on `mmap`
  for packfiles. File providers do not guarantee these.
* `.git` is a pathological sync payload: thousands of small files, with the index rewritten
  on nearly every git command, producing continuous upload churn.
* Steven explicitly does not want to hammer the Dropbox service with git traffic.
* The repository is intended to be public, so GitHub already provides an offsite copy and
  the sharing mechanism.

## Considered Options

* Keep the repository outside Dropbox (current location, `~/code/personal-agent`)
* Put the working repository inside Dropbox, `.git` included
* Keep the working tree outside Dropbox and sync a git bundle into Dropbox

## Decision Outcome

Chosen option: "Keep the repository outside Dropbox", because the failure modes of git over
a File Provider are well known and the benefit is already provided by the public remote.

The repository stays at `~/code/personal-agent`. Optionally, a scheduled
`git bundle create ~/Dropbox/backups/personal-agent.bundle --all` may provide a
belt-and-braces copy: a single file that changes only on commit, and a fully cloneable
repository.

### Positive Consequences

* git operates on a local filesystem where its atomicity assumptions hold.
* No sync churn from index rewrites, and no risk of Dropbox conflict artifacts inside
  `.git`.
* GitHub serves as the offsite copy for publishable content.
* The optional bundle gives Dropbox backup without exposing `.git` to the service.

### Negative Consequences

* If a Dropbox copy is wanted, the bundle must be scheduled and is therefore only as fresh
  as the last run.
* The repository is not backed up by Dropbox; it relies on GitHub and on whatever local
  backup exists — which is currently **no Time Machine destination**. Tracked in
  `docs/DESIGN.md` §7.3.

## Pros and Cons of the Options

### Repository outside Dropbox

* Good, because it avoids a class of file-corruption and conflict problems entirely.
* Good, because there is no ongoing sync traffic for high-churn files.
* Good, because the public remote is the appropriate backup for a public repository.
* Bad, because it does not use the sync infrastructure Steven already pays for.

### Repository inside Dropbox, `.git` included

* Good, because sync and version history would apply to the whole working tree at once.
* Bad, because File Provider semantics do not honour git's atomicity requirements, with
  documented failure modes including corrupted `.git/index` and conflicted copies of
  `packed-refs`.
* Bad, because files can be evicted to "online-only" state mid-operation, causing failures
  that are confusing rather than informative.
* Bad, because the index is rewritten on nearly every git command, so this is the worst
  possible traffic pattern for a syncing service.
* Bad, because Dropbox conflict copies inside `.git` produce repositories that fail to
  clone or check out, sometimes without an obvious cause.

### Bundle into Dropbox

* Good, because it gives Dropbox backup with a single low-churn file.
* Good, because a bundle is a complete, cloneable repository rather than a copy of a
  working tree.
* Bad, because it is a scheduled job that can silently stop running.
* Bad, because the bundle contains the full commit history, so the same question about
  what is appropriate to place in Dropbox applies to it.

## Links

* [`docs/DESIGN.md`](../docs/DESIGN.md) §7.1 — git and Dropbox
* [ADR-0003](./0003-keep-private-data-outside-the-repository.md) — why data is outside the repo
* [ADR-0005](./0005-optimize-for-reversibility-over-permission-prompts.md) — why the Obsidian vaults are not turned into repositories
