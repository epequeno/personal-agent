# personal-agent

A local, single-user project-management agent, built as a customised instance of the
[pi](https://github.com/earendil-works/pi) coding agent.

It answers one question well: **what should I work on, and what is at risk across my
projects?** It reads three local corpora, keeps durable memory between sessions, and never
sends anything to a remote service beyond the model call itself.

This repository is the shareable half — configuration, extensions, and the decision log. The
private half (sessions, memory, journal, undo) lives outside it and is never committed.

## Status

| Milestone | What it delivers | State |
|---|---|---|
| M0 | Launcher, agent identity, world model, ADR convention | **complete** |
| M1 | Durable file-based memory, session journal | **complete** |
| M2 | Generated atlas, the daily brief | atlas and `/brief` done; examples remain |
| M3 | Reversibility: undo journal, snapshots, mutation log, outbox | **complete** |
| M4 | Scheduled briefings | planned |
| M5 | Optional: FTS5 retrieval, extension loadout by directory | optional |

[`ROADMAP.md`](ROADMAP.md) holds the detail, the findings that changed the design, and a
"Resuming work" section. It is the file to read second.

**Scope & limitations:** reads three local corpora only (`~/code`, the research vault, the
personal vault) — never CRM data, email, calendars, or network APIs
([ADR-0011](adr/0011-limit-v1-scope-to-the-three-local-corpora.md)). Single-user, not a product,
not a reimplementation of OpenClaw or Hermes (see
[Scope, and what it is not](#scope-and-what-it-is-not)). macOS-specific design reasoning
([ADR-0008](adr/0008-keep-git-out-of-dropbox.md)); requires pi ≥ 1.1.0.

## How it works

The agent is **a pi distribution, not a new harness**. pi already provides sessions,
compaction, extensions, skills, prompt templates, and search; what this project adds is an
identity, a world model, memory, and a safety story.

```text
bin/pa ─┬─ PI_CODING_AGENT_DIR          → agent/                   committed, shareable
        ├─ PI_CODING_AGENT_SESSION_DIR  → ~/personal-agent-data/   private, never committed
        └─ working directory            → this repo, or --here
```

Three deliberate separations make that work:

| Separation | Why |
|---|---|
| Agent identity in `agent/`, selected by `PI_CODING_AGENT_DIR` | One identity regardless of which project you launch from, without touching your everyday `~/.pi/agent` setup — [ADR-0002](adr/0002-run-as-an-isolated-pi-agent-directory.md) |
| Private state outside the repository | Accidental publication becomes a filesystem impossibility rather than a correctness property of `.gitignore` — [ADR-0003](adr/0003-keep-private-data-outside-the-repository.md) |
| Daily sessions, one per day | Bounds context growth and cost, at the price of making memory load-bearing rather than optional — [ADR-0004](adr/0004-use-daily-sessions.md) |

## Layout

```text
personal-agent/
├── bin/pa                  launcher: wires the agent dir to the private data dir
├── agent/                  the pi agent directory
│   ├── settings.json       model, tools, packages, resource paths
│   ├── APPEND_SYSTEM.md    identity and operating rules
│   ├── AGENTS.md           the shape of the world: corpora, conventions, output formats
│   ├── extensions/         memory.ts
│   └── prompts/            /remember
├── adr/                    decision log, one decision per file
├── docs/
│   ├── BRIEF.md            the original request, verbatim
│   └── DESIGN.md           the design as it stands
├── hooks/pre-commit        refuses to commit private paths
├── tests/                  launcher and memory acceptance tests
└── ROADMAP.md

~/personal-agent-data/      private, outside this repo
├── sessions/               pi session transcripts, one per day
├── memory/                 MEMORY.md and USER.md
├── journal/                mechanical per-session records
├── atlas/ briefs/ undo/ snapshots/ outbox/    (created on first run; used by later milestones)
```

## Quick start

```bash
bin/pa                      # home context, today's session
bin/pa --here               # keep the current directory (project-scoped session)
bin/pa -c                   # continue the most recent session instead of today's
bin/pa -p "/brief"          # non-interactive run, for scheduled work (M4)
bin/pa --pi config          # escape hatch: pass arguments straight to pi
```

Override the roots with `PA_HOME` and `PA_DATA_DIR`. Nothing needs installing beyond pi itself;
`bin/pa` creates the data skeleton on first run.

## Memory

Memory is the component that makes the agent feel persistent, so it is deliberately boring:
two flat files, `MEMORY.md` and `USER.md`, in `$PA_DATA_DIR/memory`.

- Entries are separated by a line containing only `§`, and are capped at 2200 and 1375
  characters respectively. The ceiling is a feature — it forces consolidation.
- The `memory` tool supports `add`, `replace`, `remove`, and `list`. Additions that would
  overflow are refused with instructions to consolidate first.
- **The injected copy is a frozen snapshot per session.** A write reaches disk immediately but
  does not change what the current session sees, which keeps the prompt prefix — and therefore
  the prompt cache — stable across turns. `PA_MEMORY_TRACE=<path>` logs the injected section per
  turn, which is the only way to observe this.
- Writes are scanned before they land. Memory is injected into every future system prompt, so an
  entry is a persistent instruction, not a note: instruction overrides, role hijacks,
  prompt-structure tampering, credential exfiltration, and destructive commands are refused.

`/remember <fact>` is the deliberate path. A notification nudges you toward it when a
substantive session recorded nothing.

## Testing

```bash
bash tests/test-launcher.sh   # 11 assertions, no model calls, free to run
bash tests/test-memory.sh     # 11 assertions, 4 model calls, throwaway data dir
```

The launcher test puts a stub `pi` on `PATH` and asserts argv, working directory, and
environment, so it verifies the wiring without touching a model. The memory test uses a
temporary `PA_DATA_DIR`, so it never reads or writes real memory.

## Documentation map

| Question | Where |
|---|---|
| What was originally asked for? | [`docs/BRIEF.md`](docs/BRIEF.md) |
| What is the design? | [`docs/DESIGN.md`](docs/DESIGN.md) |
| Why is it that way, and what was rejected? | [`adr/README.md`](adr/README.md) — 14 records, one decision each |
| What's left, and how do I restart? | [`ROADMAP.md`](ROADMAP.md) |
| What does the agent believe about the world? | [`agent/AGENTS.md`](agent/AGENTS.md) |

`DESIGN.md` describes the present and is edited freely. `adr/` explains the past: Context and
Decision are immutable once accepted, new information goes in a dated `Updates` section, and a
reversal requires a new superseding record.

## Scope, and what it is not

In scope: `~/code`, `~/Dropbox/eapsoftware-research`, `~/Dropbox/obsidian/Personal` — all local
files. Out of scope: live CRM data, the lead pipeline, email, calendars, and any network API —
[ADR-0011](adr/0011-limit-v1-scope-to-the-three-local-corpora.md).

It is not a product, not multi-user, and not a reimplementation of OpenClaw or Hermes. Those
informed the design; see `Dropbox/eapsoftware-research/persistent-memory-systems-research.md`
for the survey that shaped the memory tier.

## Privacy model

Private state lives outside the repository, so `.gitignore` is not the primary control. It is
still applied, because the repository is public and a single mistake is unrecoverable:

1. `$PA_DATA_DIR` is outside the repo entirely, and defaults to `~/personal-agent-data`.
2. `.gitignore` covers private paths, `agent/auth.json`, and archives.
3. `hooks/pre-commit` fails on any staged path that looks private.
4. `agent/auth.json` is a symlink to `~/.pi/agent/auth.json`, so credentials are shared and never
   copied into the working tree.

Structure lives in the repository; personal facts live in the data directory.

## Requirements

- pi 1.1.0 or later (tested against 1.1.0)
- macOS — the design reasoning about File Providers is macOS-specific
  ([ADR-0008](adr/0008-keep-git-out-of-dropbox.md))
- A model provider; the default is OpenRouter `deepseek/deepseek-v4.1-flash`

## Findings worth knowing

Measuring the corpora rather than assuming anything about them changed the design four times:

- `~/code` holds **48 directories and 38 git repos** (re-derived 2026-10-10) — not the ~58 and 35
  first assumed, which had counted loose files and archives.
- **Status documents barely exist — and disagree.** Roughly 55 status-bearing documents sit
  across the corpora: ~15 roadmap files in `~/code`, and 35 `_Index.md` files in the research
  vault, 15 of which carry a `## Status` heading in 15 different free-text vocabularies. (An
  earlier version of this README claimed there were none in the research vault — wrong.) Four
  top-level documents each claimed to own "what is in flight". So per-project status has to be
  *derived* from git state and timestamps, not read from a document — which is why the atlas
  became the primary evidence source rather than a convenience layer.
- **The agent directory is partly generated.** pi writes 44 MB of `node_modules` plus LMDB
  databases into `agent/`, so only hand-written files are committed, and each new package needs
  an ignore rule.
- **One repository has no commits** — `pipeline-monitor` — and that is now a deliberate,
  accepted risk (2026-10-08) rather than the five-repository exposure this finding started as;
  the rest were either committed and pushed or de-repo'd that day.
