# personal-agent — Roadmap

> Format is the checkbox syntax parsed by `~/.pi/agent/extensions/roadmap.ts`.
> `##` / `###` headings are treated as phases. See `docs/DESIGN.md` for the decision
> record behind these milestones.

## Resuming work

**State: M0 and M1 are complete. Next is M2.**

To pick this up cold, in order:

1. `docs/DESIGN.md` — what the design is.
2. `adr/README.md` — why, and what was rejected. Short: 14 records, one decision each.
3. The completed milestones below, including their "findings that changed the design".
4. Verify before extending:
   - `bash tests/test-launcher.sh` — 11 assertions, no model calls, free to run
   - `bash tests/test-memory.sh` — 11 assertions, 4 model calls, throwaway `PA_DATA_DIR`
5. Start M2.

Two things a cold start must not assume, because both surprised us:

- **Status documents barely exist.** There are 16 roadmap files across `~/code` and the
  research vault, covering roughly 10 projects, and none in the research vault. Agent
  status is derived from git state and timestamps, not read from a status document. See
  `docs/DESIGN.md` §5.
- **The agent directory is partly generated.** `pi` writes `agent/npm/` (44 MB of
  `node_modules`), `agent/models-store.json`, and `agent/pi-fff/` into it. These are
  gitignored, and adding a package means adding an ignore rule. See ADR-0002 → Updates.

## M0 — Skeleton — **complete**

- [x] `bin/pa` launcher: `PI_CODING_AGENT_DIR`, `PI_CODING_AGENT_SESSION_DIR`, home-by-default cwd, `--here` passthrough, `--session-id pa-YYYY-MM-DD`, `--pi` escape hatch
- [x] `agent/settings.json`: model, `defaultTools`, `packages` (`pi-fff`, `pi-markdown-preview`), resource paths for core extensions and skills
- [x] `agent/APPEND_SYSTEM.md`: agent identity and operating rules
- [x] `agent/AGENTS.md`: corpus paths, definition of a project, conventions, output formats
- [x] `.gitignore` and `hooks/pre-commit` failing on any staged private path
- [x] Resolve `auth.json`: symlinked to `~/.pi/agent/auth.json` and gitignored
- [x] `tests/test-launcher.sh` covering the launcher's acceptance criteria with a stub `pi`
- [x] Adopt the ADR convention: `adr/README.md`, `adr/template.md`, `adr/0001-record-architecture-decisions.md`
- [x] Backfill ADRs 0002–0014 from `docs/DESIGN.md`
- [x] Corpus conventions in `agent/AGENTS.md`: all of `~/code` counts as a project; `_Home.md` is the priority hub, not ground truth; qualify ADR references by project namespace
- [x] Verify: `pa` launches isolated from any cwd; `pa --here` respects cwd; 11/11 launcher tests pass
- [ ] Port the upstream ADR skill into `agent/skills/adr/` so the agent can draft ADRs itself (ADR-0014)

### Findings during M0 that changed the design

- `~/code` holds 45 directories and 33 git repos, not the ~58/35 originally assumed; the
  earlier count included loose files and archives.
- Only 16 roadmap files exist across `~/code` and the research vault, and none in the
  research vault — see the verified constraint in `docs/DESIGN.md` §5 and M2 below.
- Five `~/code` repos have no commits at all (`legal-kit`, `personal-agent`,
  `personal-site`, `pipeline-monitor`, `rag-eval-project`).
- `pi list` runs an agent turn rather than dispatching as a subcommand; the launcher now
  uses an explicit `--pi` escape hatch.
- Sessions with an explicit `--session-dir` are stored flat, and daily ids are
  project-scoped — resolve a session by id **and** cwd.

## M1 — Memory — **complete**

- [x] `memory` tool: add / replace / remove / **list** over `MEMORY.md` and `USER.md`
- [x] `§`-delimited entries with hard character ceilings (memory 2200, user 1375)
- [x] Atomic writes (temp file, `fsync`, rename)
- [x] Injection scanning: refuses instruction overrides, role hijacks, prompt-structure tampering, credential exfiltration, destructive commands
- [x] Injection via `before_agent_start` prompt section, with a frozen per-session snapshot
- [x] `/remember` prompt template
- [x] `session_shutdown` hook: mechanical cycle record to `journal/YYYY-MM-DD.md`
- [x] `agent_settled` nudge toward `/remember` when a substantive session recorded nothing
- [x] `PA_MEMORY_TRACE` observability hook for the injected section
- [x] `tests/test-memory.sh` — 11 assertions, 4 model calls, throwaway `PA_DATA_DIR`
- [x] Verify: a fact from session A appears in session B; mid-session writes leave the injected section byte-identical

### Findings during M1

- **The frozen snapshot was untestable by ordinary means.** Asking the model to recall a
  marker written earlier in the same session always succeeds — the tool-call arguments are
  in the transcript, so the answer comes from conversation, not from memory injection. The
  first version of the test therefore reported a false failure. `PA_MEMORY_TRACE` exists to
  observe the injected section directly.
- Memory is injected as a named prompt **section**, which pi renders XML-wrapped. That is
  the cache-stable path; a whole-prompt replacement would invalidate the prefix every turn.
- The agent qualified ADR references by project unprompted (`personal-agent ADR-0003`),
  which is the ADR-0012 namespace rule taking effect from the system prompt alone.

## M2 — World model

- [ ] `pa-atlas` deterministic script walking the three corpora
- [ ] Per-project cards in `atlas/<slug>.md`: last activity, git state, open TODOs, note links, size — with roadmap next items only where a roadmap exists (rare: 16 files across `~/code` and the research vault, none in the vault)
- [ ] Derive status from git state, timestamps, and TODOs rather than from status documents
- [ ] Flag the five repos with no commits as at-risk
- [ ] `atlas/index.md` roll-up with flags for stale / blocked / recently active
- [ ] `/brief` prompt template producing a prioritized, actionable brief
- [ ] `docs/examples/` with hand-picked sanitized briefs for the public demo
- [ ] Verify: every project in the three corpora appears in the index; `/brief` needs no LLM indexing pass; a stale claim in `_Home.md` is caught and reported, not repeated

## M3 — Reversibility

- [ ] `tool_call` hook: before-image of every corpus file written or edited → `undo/<date>/<relpath>`
- [ ] Daily `tar` snapshots of both Obsidian vaults; retention 14 daily + 8 weekly
- [ ] `journal/mutations.jsonl`: timestamp, tool, path, before-hash, after-hash, session id
- [ ] Outbox: multi-file edits, deletions, or changes touching more than N files write a plan + diff to `outbox/` and ask once before applying
- [ ] Close the uncovered mutation path: `bash`-mediated edits (`sed -i`, `mv`, `rm`, redirection) bypass the `tool_call` hook — either add a bash guard or accept the risk explicitly (ADR-0005)
- [ ] Verify: any corpus write is revertible from `undo/`; every mutation is in the audit trail

## M4 — Proactive

- [ ] launchd (or cron) job running `pa --print "/brief"`
- [ ] Briefs written to `briefs/YYYY-MM-DD.md`
- [ ] Unread-brief surfacing at next interactive launch
- [ ] Verify: a brief appears unattended and is reported at next launch

## M5 — Optional escalations

- [ ] Loadout extension: register project-specific extensions as `deferred`/`codemode`, activate by cwd
- [ ] SQLite FTS5 index over the corpora — only if grep measurably falls short
- [ ] agentmemory MCP integration — only if hybrid retrieval is actually needed
- [ ] `--redact` mode on the brief writer for public demo output
- [ ] Retention policy for `journal/` and `undo/`

## Open items

- [ ] **Push the repository to GitHub.** The repo has no remote and exists only on this
      disk, and there is no Time Machine destination either. ADR-0008 assumes GitHub is the
      offsite copy, but the remote was never created. This is the largest risk to the
      project's continuity — larger than anything in M2–M5.
- [ ] Retention/rotation policy for `journal/` and `undo/`
- [ ] `--redact` mode on the brief writer for public demo output
- [ ] Port the upstream ADR skill into `agent/skills/adr/` (ADR-0014)

## Pending decisions

Recorded here so they do not survive only in conversation.

- [ ] **What should the brief contain?** Blocks the second half of M2. `agent/AGENTS.md`
      holds a provisional shape (`Now` / `At risk` / `Divergence` / `Quiet`), but the
      generator is only as useful as the format, so settle the format first.

## Triggers (revisit when)

- [ ] Backup — when `$PA_DATA_DIR` has a populated `memory/` and more than a few weeks of `journal/` (ADR-0013)
- [ ] Retrieval escalation to FTS5 or agentmemory — only if the atlas plus grep measurably falls short (ADR-0007)
- [ ] Loadout extension — once the core extension set has been used enough to revise it (ADR-0010)
