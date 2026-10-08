# Architecture Decision Records

This directory is the decision log for `personal-agent`. It records **why** the project
is shaped the way it is. It is not a description of the current design — that is
[`docs/DESIGN.md`](../docs/DESIGN.md).

| Artifact | Answers | Changes |
|---|---|---|
| `docs/DESIGN.md` | "What is the design right now?" | Edited freely as the design evolves |
| `adr/*.md` | "Why is it that way, and what did we reject?" | Context and Decision are immutable; addenda and superseding ADRs only |

Convention follows [architecture-decision-record](https://github.com/architecture-decision-record/architecture-decision-record).

## Rules

- **One decision per ADR.** If a document has two decisions, it is two documents.
- **File name:** `NNNN-imperative-verb-phrase.md` — zero-padded number, present-tense
  imperative verb phrase, lowercase, dashes. The number exists so supersession links
  (`superseded by ADR-0007`) resolve.
- **Template:** [MADR](./template.md), trimmed. Optional sections may be omitted.
- **Status:** `proposed`, `accepted`, `rejected`, `deprecated`, or
  `superseded by ADR-NNNN`. A decision starts `proposed`, becomes `accepted` when
  agreed, and is never silently reversed.
- **Immutability:** the **Context** and **Decision** sections are never edited after
  acceptance. New information goes in a dated **Updates** section at the bottom. A
  change of direction is a **new ADR that supersedes** the old one — the old file stays,
  with its status updated and a link to the successor.
- **Date everything.** Costs, schedules, and assumptions change; an undated rationale
  is unusable a year later.
- **Write the alternatives down.** A rejected option with its tradeoff is often worth
  more than the chosen one, because it stops the same debate being relitigated.
- **The agent may draft; only Steven accepts.** The agent creates ADRs with status
  `proposed`, and never changes a status, edits an accepted ADR's Context or Decision,
  deletes, or renumbers. See [ADR-0014](./0014-let-the-agent-draft-adrs.md).

## Decision log

### Accepted

| ADR | Decision | Date |
|---|---|---|
| [0001](./0001-record-architecture-decisions.md) | Record architecture decisions | 2026-10-08 |
| [0002](./0002-run-as-an-isolated-pi-agent-directory.md) | Run as an isolated pi agent directory | 2026-10-08 |
| [0003](./0003-keep-private-data-outside-the-repository.md) | Keep private data outside the repository | 2026-10-08 |
| [0004](./0004-use-daily-sessions.md) | Use daily sessions | 2026-10-08 |
| [0005](./0005-optimize-for-reversibility-over-permission-prompts.md) | Optimize for reversibility over permission prompts | 2026-10-08 |
| [0006](./0006-store-durable-facts-as-file-based-memory.md) | Store durable facts as file-based memory | 2026-10-08 |
| [0007](./0007-derive-the-world-model-from-a-generated-atlas.md) | Derive the world model from a generated atlas | 2026-10-08 |
| [0008](./0008-keep-git-out-of-dropbox.md) | Keep `.git` out of Dropbox | 2026-10-08 |
| [0009](./0009-defer-a-proactive-daemon-in-favor-of-scheduled-runs.md) | Defer a proactive daemon in favor of scheduled runs | 2026-10-08 |
| [0010](./0010-curate-the-extension-loadout.md) | Curate the extension loadout | 2026-10-08 |
| [0011](./0011-limit-v1-scope-to-the-three-local-corpora.md) | Limit v1 scope to the three local corpora | 2026-10-08 |
| [0012](./0012-treat-the-priorities-hub-as-a-verified-claim.md) | Treat the priorities hub as a verified claim | 2026-10-08 |
| [0013](./0013-defer-backup-of-the-data-directory.md) | Defer backup of the data directory | 2026-10-08 |
| [0014](./0014-let-the-agent-draft-adrs.md) | Let the agent draft ADRs | 2026-10-08 |

### Superseded, deprecated, or rejected

_None yet._

## Open decisions

Decisions identified but not yet made. These are the `proposed` ADRs that do not exist
even in draft form — they are genuinely undecided.

| Topic | Status | Note |
|---|---|---|
| Retention policy for `journal/` and `undo/` | Open | `DESIGN.md` §11 O4 |
| Sanitization for public demo output | Open | `docs/examples/` briefs are hand-picked for now; a `--redact` mode is later work |

Settled items are recorded rather than removed:

| Topic | Outcome | ADR |
|---|---|---|
| Backup strategy | Deferred, local-only, with a revisit trigger | [0013](./0013-defer-backup-of-the-data-directory.md) |
| ADR authoring by the agent | Drafts only, status `proposed` | [0014](./0014-let-the-agent-draft-adrs.md) |
| EAP business state in v1 scope | Excluded; reached via documents only | [0011](./0011-limit-v1-scope-to-the-three-local-corpora.md) |
