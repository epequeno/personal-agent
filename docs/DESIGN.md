# personal-agent — Design

> Status: **decided**. This document describes the design **as it stands**.
>
> The reasoning behind each decision — including the alternatives that were rejected —
> lives in [`adr/`](../adr/README.md). This file answers *"what is the design?"*; the
> ADRs answer *"why is it that way?"*. Substantive changes start as an ADR and then land
> here.

---

## 1. What this is

A local, personal agent for cross-project project management. It is a **customized
instance of the pi coding agent**, not a new harness.

Concretely, this project is three things:

1. **A pi distribution** — an isolated agent directory (`agent/`) holding the agent's
   identity, settings, extensions, skills, and prompt templates.
2. **A private workspace** — durable state (sessions, memory, atlas, briefs, journal)
   at `~/personal-agent-data`, outside this repository and never published.
3. **A launcher** — `bin/pa`, which wires the two together and pins the session model.

### What pi already provides (do not rebuild)

| Capability | Provided by |
|---|---|
| Session persistence, resume, fork, compaction | pi sessions (JSONL, grouped by cwd) |
| Episodic search across past conversations | `chat-history` skill (`~/.agents/skills`) |
| Tools, hooks, commands, UI | pi extensions |
| Non-interactive runs for scheduling | `pi --print` / `--mode json` |
| Context files | `AGENTS.md` discovery + `APPEND_SYSTEM.md` |
| Search primitives | `pi-fff` package (grep / find / multi-grep) |
| Credentials | `auth.json` in the agent dir |

### Non-goals

- Not a re-implementation of OpenClaw, Hermes, or agentmemory.
- Not a product for other users. Single-user, single-machine.
- **Not** EAP CRM Phase 10 (`code/eap-software/docs/.../CRM/10 - AI Operations Agent.md`).
  That is an AWS/Bedrock, customer-facing CRM feature. This is Steven's local PM.
  However, this project is the prototyping bench for Phase 10 patterns (briefings,
  recommendation records, memory tiers, audit trail).

---

## 2. Locked decisions

This table is the summary. Each row corresponds to an entry in the
[decision log](../adr/README.md), which carries the rationale and the alternatives that
were rejected.

| # | Decision | Value |
|---|---|---|
| 1 | v1 job | **Cross-project PM** — one job, done well |
| 2 | Working directory | **Home by default.** `pa` runs with cwd `$PA_HOME`; `pa --here` follows the current directory |
| 3 | Session model | **Daily sessions**, `--session-id pa-YYYY-MM-DD`. No `--continue` drift, no context bloat |
| 4 | Action capability | **Full.** The agent may act; safety comes from reversibility, not permission prompts |
| 5 | Data location | **`~/personal-agent-data`**, outside the repo, never published |
| 6 | Repo visibility | **Public** (demo of "how I work"), namespaced, generic name accepted |
| 7 | `.git` in Dropbox | **No** — see §7 |

### Corpora the agent operates over

| Corpus | Path | VCS / safety net |
|---|---|---|
| Research vault | `/Users/steven/Dropbox/eapsoftware-research` | Obsidian; **not a git repo**; Dropbox versions only |
| Code | `/Users/steven/code` | 35 git repos; ~23 dirs are not repos |
| Personal vault | `/Users/steven/Dropbox/obsidian/Personal` | Obsidian; **not a git repo**; Dropbox versions only |

Two of three corpora have no local version control. This is why §6 is built around
reversibility.

---

## 3. Layout

### Repository (public, committed)

```
personal-agent/
├── bin/
│   └── pa                  # launcher: env wiring + session id + cwd policy
├── agent/                  # THE PI AGENT DIR (PI_CODING_AGENT_DIR)
│   ├── settings.json       # model, tools, resource paths, packages
│   ├── APPEND_SYSTEM.md    # identity + operating rules
│   ├── AGENTS.md           # the *shape* of the world (see §4)
│   ├── extensions/         # our code
│   ├── skills/             # our skills
│   ├── prompts/            # /brief, /triage, /week, /remember
│   └── themes/
├── docs/
│   ├── DESIGN.md           # this file
│   └── examples/           # sanitized sample briefs (demo content)
├── ROADMAP.md              # dogfood the roadmap extension on this repo
├── README.md
├── .gitignore              # defense in depth; see §7
├── hooks/pre-commit        # fails on any staged private path
└── tests/test-launcher.sh  # launcher acceptance test, no model calls
```

`agent/` is **partly generated, mostly hand-written.** pi installs packages and writes
runtime state into the agent directory. Observed after the first M0 run:

| Generated | Size | What |
|---|---|---|
| `agent/npm/` | 44 MB | `node_modules` for `pi-fff` and `pi-markdown-preview`, including `puppeteer-core` |
| `agent/models-store.json` | 2 B initial | Model catalog cache |
| `agent/pi-fff/` | 448 KB | LMDB frecency and history databases |

All of it is gitignored; only hand-written files are committed. The consequence is a
maintenance obligation the original decision did not anticipate: **each new package needs a
matching ignore rule**, or its state lands in a public repository.

### Data directory (private, outside the repo)

```
~/personal-agent-data/            # $PA_DATA_DIR
├── sessions/                     # PI_CODING_AGENT_SESSION_DIR
├── memory/                       # MEMORY.md, USER.md, facts/
├── atlas/                        # generated per-project state cards
├── briefs/                       # dated briefing output
├── journal/                      # YYYY-MM-DD.md cycle summaries; mutations.jsonl
├── undo/                         # per-write before-images
├── snapshots/                    # daily tars of the two Obsidian vaults
└── outbox/                       # plans + diffs awaiting approval
```

**Principle: structure in the repo, personal facts in the data dir.**

- `agent/AGENTS.md` — corpus paths, what counts as a project, conventions, tone,
  output formats. Publishable, and good demo content.
- `$PA_DATA_DIR/memory/USER.md` — who Steven is, preferences, current priorities.
  Never published.

---

## 4. Identity and launch

`bin/pa`:

```sh
PA_HOME="${PA_HOME:-$HOME/code/personal-agent}"
PA_DATA_DIR="${PA_DATA_DIR:-$HOME/personal-agent-data}"

export PI_CODING_AGENT_DIR="$PA_HOME/agent"
export PI_CODING_AGENT_SESSION_DIR="$PA_DATA_DIR/sessions"

# cwd policy: home by default, --here to stay put
[ "$1" = "--here" ] && shift || cd "$PA_HOME"

exec pi --session-id "pa-$(date +%F)" "$@"
```

Notes:

- `PI_CODING_AGENT_DIR` gives a stable identity that applies **regardless of cwd**.
  This is the reason for an agent dir rather than a project `.pi/`.
- `PI_CODING_AGENT_SESSION_DIR` must be **absolute** — the `sessionDir` setting
  resolves relative paths from the working directory, which varies.
- `--session-id` is deterministic: pi opens `pa-2026-10-08` if it exists, creates it
  if not. Daily rollover falls out for free.
- **Session ids are project-scoped, and the session directory is flat.** Verified: running
  `pa` and then `pa --here` on the same day produces two files both named
  `pa-YYYY-MM-DD`, distinguished only by `cwd` in the session header. Resolve a session by
  **id and cwd together**; an id alone is ambiguous, and `--resume` from a different
  directory will offer to fork the cross-project match.
- **pi does not reliably distinguish a subcommand from a prompt.** Bare `pi list` was
  observed running an agent turn with `list` as the message — a model call, not a listing.
  The launcher therefore passes through only `--help`/`--version`, and exposes pi's own
  subcommands via an explicit `pa --pi <args>` escape hatch.
- Agent-dir extensions are *personal* extensions and are therefore trusted; project
  trust does not gate them.
- **Gotcha:** `auth.json` lives in the agent dir. Once the agent dir is this repo,
  credentials land in the repo → `agent/auth.json` must be gitignored, or symlinked
  to the existing `~/.pi/agent/auth.json`.

---

## 5. The world model

The world model has two layers with different trust properties:

| Layer | Source | Trust |
|---|---|---|
| **Priority** | `_Home.md`, roadmaps, project notes — human-authored | Read as *claims*; verified before being repeated |
| **Evidence** | Generated atlas, git state, file timestamps, session history | Factual, but intent-blind |

Human intent — why something is parked, which artifact is in flight — cannot be derived
mechanically, so the priority layer is necessary. But it goes stale within hours and is
only partially confirmed, so it is never asserted unverified. When the two layers disagree,
**both are reported**; the document is not silently reconciled to the evidence. The
priorities hub is never edited unless explicitly asked.

### Cross-corpus reference rules

- **Qualify every ADR reference with its project.** ADR numbers are per-project
  namespaces, and at least eight exist across the corpora (`data-role-transition`,
  `eap-software/docs/eap-software/ADR`, `legal-kit/docs/architecture/adrs`,
  `medcheck/docs/decisions`, `clear-vial`, `mlb-statcast-dbt`, `keystone-cms-pipeline`,
  `cms-pipeline`, `nyc-tlc-analytics-case-study`). An unqualified "ADR 0011" is ambiguous
  and resolves wrongly by default.
- Prefer the evidence layer for anything structural; the priority layer for anything
  involving intent, sequencing, or justification.

Retrieval order for any PM question:

```
atlas card  →  grep corpus  →  chat-history skill  →  memory
```

### Atlas (M2)

A **deterministic, LLM-free** script that walks the three corpora and emits:

- `$PA_DATA_DIR/atlas/index.md` — one line per project: name, corpus, last activity,
  roadmap completion, open-item count, flags.
- `$PA_DATA_DIR/atlas/<slug>.md` — a short card per project: last commit / mtime,
  ROADMAP next items, open TODOs, note links, recent sessions (from the `chat-history`
  skill's location), size.

Regenerated on demand (and by the scheduled brief). This answers the large majority of
"what's the state of X" and "what should I work on" questions with no database, no
embeddings, and no token cost for generation.

**Verified constraint (2026-10-08): roadmaps are rare.** Only 16 roadmap-ish markdown files
exist across `~/code` and the research vault, covering roughly 10 projects; the research
vault has none. So per-project status cannot be read from a roadmap for most projects — the
atlas must derive it from git state, file timestamps, and open TODOs, and treat a roadmap
as a bonus when one is present. `.pi/skills`-adjacent tooling such as `roadmap.ts` reaches
far fewer projects than originally assumed.

**Escalation path, only if grep demonstrably fails:** SQLite FTS5 index → hybrid
retrieval → agentmemory MCP. Not v1. The existing research
(`Dropbox/eapsoftware-research/persistent-memory-systems-research.md`, §5e) says the
same: don't build a custom store from scratch.

---

## 6. Persistence and safety

### 6.1 Memory tiers

| Tier | Store | Mechanism |
|---|---|---|
| Procedural / static | `agent/AGENTS.md` | Committed context file, always loaded |
| Semantic | `$PA_DATA_DIR/memory/{MEMORY.md,USER.md}` | `memory` tool (add/replace/remove), char-bounded, Hermes-style |
| Episodic | `$PA_DATA_DIR/sessions/*.jsonl` | pi sessions; searched via `chat-history` skill |
| Derived | `$PA_DATA_DIR/atlas/` | Regenerable; never authoritative |

Memory injection uses `before_agent_start` prompt sections with a **frozen per-session
snapshot**: mid-session writes update disk immediately but do not mutate the current
session's injected copy. This keeps the prompt-cache prefix stable. The snapshot
refreshes on the next session start.

Entry format and limits follow the Hermes design: `§`-delimited entries, hard character
ceilings (memory ≈2200, user ≈1375) to force compactness, atomic writes via temp file +
rename, and substring matching for replace/remove.

### 6.2 Journaling

- `session_shutdown` hook → append a **mechanical** cycle record to
  `$PA_DATA_DIR/journal/YYYY-MM-DD.md`: time, session id, shutdown reason, prompt count,
  model, cwd, whether memory was written, and truncated prompt excerpts. Deliberately not
  an LLM-written narrative — a journal that costs a model call on every exit is a journal
  that gets disabled.
- Fact **proposals** are an `agent_settled` notification rather than an LLM extraction: if
  a session recorded nothing to memory after three or more prompts, the user is nudged
  toward `/remember`. Automatic capture from day one is where the research says this gets
  muddy, so a reminder replaces it.
- Explicit `/remember` prompt template + `memory` tool for deliberate capture.
- `PA_MEMORY_TRACE=<path>` appends one JSON line per turn carrying the exact injected
  memory section. This is how the frozen-snapshot property is verified, and it doubles as
  a way to demonstrate the behaviour.

### 6.3 Reversibility (replaces permission prompts)

| Layer | What it does |
|---|---|
| **Undo journal** | `tool_call` hook on `write`/`edit`: if the target is under a corpus, copy the current file (or record "did not exist") to `$PA_DATA_DIR/undo/<date>/<relpath>` *before* the write proceeds |
| **Daily snapshots** | `tar` of both Obsidian vaults into `$PA_DATA_DIR/snapshots/` (vaults total ~5.4M). Retention: 14 daily + 8 weekly |
| **Outbox** | Multi-file restructures, deletions, or any change touching >N files writes a plan + diff to `$PA_DATA_DIR/outbox/` and asks once. Single writes proceed directly, journaled |
| **Audit trail** | Every corpus mutation appended to `$PA_DATA_DIR/journal/mutations.jsonl`: timestamp, tool, path, before-hash, after-hash, session id |

The audit trail is also the same record shape Phase 10 wants for "agent reasoning is
logged and auditable", and it is strong demo material.

---

## 7. Git and backup

### 7.1 Why `.git` stays out of Dropbox

On this machine `~/Dropbox` → `~/Library/CloudStorage/Dropbox`, i.e. Dropbox is a macOS
**File Provider**, not a plain synced directory. Git relies on atomic `rename()` and
`fsync` semantics; file providers do not guarantee them. Failure modes include corrupted
`.git/index`, `packed-refs (conflicted copy)`, and objects evicted to online-only
mid-operation. Separately, `.git` is the worst possible sync payload: thousands of tiny
files with high churn, since the index is rewritten on nearly every git command.

- Repo stays at `~/code/personal-agent` (already outside Dropbox).
- If a Dropbox copy is wanted, sync an **archive**: `git bundle create
  ~/Dropbox/backups/personal-agent.bundle --all` on a schedule. One file, changes only
  on commit, cloneable.

### 7.2 Private-path protection (defense in depth)

Data lives outside the repo, so `.gitignore` is not the primary control — but it is
still applied, because the repo is **public** and a single mistake is unrecoverable:

1. `.gitignore`: `data/`, `memory/`, `sessions/`, `atlas/`, `briefs/`, `journal/`,
   `undo/`, `snapshots/`, `outbox/`, `agent/auth.json`, `*.local.*`, `*.bundle`
2. A pre-commit hook that **fails** on any staged path matching those patterns.
3. A CI check with the same rule (public repo → published content is scraped instantly).

### 7.3 Backup — deferred, local-only

`tmutil destinationinfo` reports **no Time Machine destinations**, and
`~/personal-agent-data` is deliberately outside Dropbox, so the data directory has no
backup. This is a **deliberate, dated deferral**, not an oversight — see
[ADR-0013](../adr/0013-defer-backup-of-the-data-directory.md).

Direction when revisited: **local only** — Time Machine, plus a local-only git repository
for `memory/` and `journal/` if per-change history is wanted. Cloud and encrypted-remote
options are out, consistent with the local-only requirement.

**Revisit trigger:** when `$PA_DATA_DIR` holds a populated `memory/` and more than a few
weeks of `journal/`.

Asymmetry that makes the deferral acceptable: the corpora are unaffected by disk failure
(they live in Dropbox and on GitHub) and `atlas/` is regenerable. Only `memory/` and
`journal/` are irreplaceable, and they will be small and young for some time.

---

## 8. Extension loadout

### Core — loaded always

| Extension | Adds | Why |
|---|---|---|
| `roadmap.ts` | `roadmap_query` tool, `/roadmap`, `/roadmap audit`, `/roadmap clean` | Bedrock of cross-project PM; auto-discovers roadmaps |
| `subagent` | `subagent` tool (single / parallel / chain) | Parallel sweeps across dozens of projects. Requires `thread-weave` skill + `thread-worker` agents |
| `vision-bridge` | `describe_image`, `/vision-check` | Screenshots and diagrams embedded in Obsidian notes |
| `openrouter-service-tier` | `/or-tier`, `/or-fast` | Cost/latency control for scheduled runs |
| `proceed-shortcut` | two shortcuts | QoL, no schema cost |

### Packages — carried over

| Package | Provides |
|---|---|
| `pi-fff` | `grep`, `find_files`, `fff_multi_grep` — the search primitives the atlas design leans on |
| `pi-markdown-preview` | `preview_export` — briefs to PDF/HTML for the public demo |

### Available on demand — not loaded into the PM agent

| Extension | Adds | Activation |
|---|---|---|
| `init-prompts` | `/init-prompts` | When settling into a repo |
| `disk-analyzer` | `/disk-scan` | Periodic "what's big / what's stale" input to the atlas |
| `cleanup` | `/cleanup` | Only relevant with heavy `agent-browser` use |

### Not loaded

`code-review` (`/elm-review`, `/rust-review`), `test-quality`
(`/test-quality-*`), `ux-toolkit` (`/ux-scan`, `/ux-scaffold`), `study-tools`
(`/wrap-up`, `/quiz`), `study-bootstrap` (`/book-study-bootstrap`, hardcodes the
ai-study template vault), `paper-mcp` (13 tools, heavy schema, needs the Paper app).

### Future: loadout extension

Rather than choosing permanently, a small **loadout extension** can register the
project-specific extensions with `exposure: "deferred"` or `"codemode"` and call
`pi.setActiveTools()` based on cwd — `/elm-review` becomes active only in an Elm repo,
`/disk-scan` on Fridays, and so on. This keeps schemas out of the PM prompt while
leaving every capability reachable. M2-adjacent, not M0.

---

## 9. Proactive layer

No daemon in v1. The inbox pattern:

1. cron / launchd runs `pa --print "/brief"`.
2. Output lands in `$PA_DATA_DIR/briefs/YYYY-MM-DD.md`.
3. The next interactive `pa` session reports unread briefs.

`pi --mode rpc` as a resident server is a v3 option only if the scheduled-run cold start
proves annoying.

---

## 10. Milestones

| M | Deliverable | Acceptance |
|---|---|---|
| **M0** | Skeleton: `bin/pa`, `agent/settings.json`, `APPEND_SYSTEM.md`, `AGENTS.md`, `.gitignore`, pre-commit hook, `ROADMAP.md` | `pa` launches with an isolated identity from any cwd; `pa --here` respects cwd; no private path is trackable; `roadmap_query` works on this repo |
| **M1** | Memory extension: `MEMORY.md`/`USER.md`, `memory` tool, frozen-snapshot injection, `/remember`, `session_end` journal + fact proposals | A fact written in session A is present in session B; mid-session writes do not shift the prompt prefix |
| **M2** | Atlas (`pa-atlas` script) + `/brief` prompt template | `atlas/index.md` lists every project in the three corpora; `/brief` produces a prioritized, actionable brief without an LLM indexing pass |
| **M3** | Reversibility: undo journal, daily snapshots, `mutations.jsonl`, outbox threshold | Any corpus write can be reverted from `undo/`; every mutation appears in the audit trail |
| **M4** | Scheduled briefing: launchd/cron + unread-brief surfacing | A brief appears in `briefs/` unattended and is reported at next launch |
| **M5** | Optional: FTS5 index, agentmemory MCP, loadout extension | Only if M2 retrieval measurably falls short |

---

## 11. Open items

| # | Item | Owner | Notes |
|---|---|---|---|
| O1 | ~~Backup strategy~~ | Steven | **Resolved** — deferred, local-only. [ADR-0013](../adr/0013-defer-backup-of-the-data-directory.md) |
| O2 | Sanitization for public demo | TBD | `docs/examples/` briefs are hand-picked for now; a `--redact` mode on the brief writer is a later convenience |
| O3 | ~~EAP business state in scope?~~ | Steven | **Resolved** — three corpora only. [ADR-0011](../adr/0011-limit-v1-scope-to-the-three-local-corpora.md) |
| O4 | Retention/rotation policy for `journal/` and `undo/` | TBD | Snapshot retention is set (14 daily + 8 weekly); journal/undo unbounded at first |
| O5 | ~~May the agent author ADRs?~~ | Steven | **Resolved** — drafts only, status `proposed`. [ADR-0014](../adr/0014-let-the-agent-draft-adrs.md) |
