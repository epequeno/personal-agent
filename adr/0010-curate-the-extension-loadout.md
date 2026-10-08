# 0010 — Curate the extension loadout

* Status: accepted
* Deciders: Steven
* Date: 2026-10-08

## Context and Problem Statement

The existing `~/.pi/agent/extensions` directory holds 20 extensions built up for coding
work, plus two packages (`pi-fff`, `pi-markdown-preview`). A pi extension contributes tool
schemas to the model's prompt, so an unused extension is not free — it costs tokens on
every request and adds noise the model must reason around.

A project-management agent has quite different needs from a coding agent. Which extensions
should it load?

## Decision Drivers

* Tool schemas occupy prompt space on every request, so irrelevant extensions are a
  recurring cost, not a one-off.
* Relevance: a cross-project PM agent needs roadmaps, delegation, and search; it does not
  need Elm or Rust review pipelines.
* M0 should be simple. A loadout system is machinery, and machinery should be earned.
* Extensions are referenced by absolute path from `agent/settings.json`, so the choice is
  explicit and reviewable in the repository.

## Considered Options

* A curated core set, with the rest available on demand
* Inherit all 20 extensions
* Reimplement a minimal toolset specific to project management
* A loadout extension that registers everything as `deferred`/`codemode` and activates by
  working directory

## Decision Outcome

Chosen option: "A curated core set, with the rest available on demand", because it keeps
the prompt lean without discarding capability, and defers the only real machinery involved.

**Core, loaded always:** `roadmap.ts` (the `roadmap_query` tool plus `/roadmap`,
`/roadmap audit`, `/roadmap clean`), `subagent` (parallel per-project sweeps),
`vision-bridge` (`describe_image`, for screenshots and diagrams embedded in notes),
`openrouter-service-tier` (cost and latency control for scheduled runs), and
`proceed-shortcut` (no schema cost).

**Packages:** `pi-fff` (`grep`, `find_files`, `fff_multi_grep` — the search primitives the
atlas design depends on) and `pi-markdown-preview` (briefs to PDF or HTML for public
demonstration).

**Available, not loaded:** `init-prompts`, `disk-analyzer`, `cleanup`.

**Not loaded:** `code-review`, `test-quality`, `ux-toolkit`, `study-tools`,
`study-bootstrap`, `paper-mcp`. These are project-type-specific or carry large schemas
relative to their relevance.

The loadout extension — registering project-specific extensions with
`exposure: "deferred"` or `"codemode"` and calling `pi.setActiveTools()` based on cwd — is
deferred to M5, once the core agent has proven useful.

### Positive Consequences

* The prompt carries only tools with a plausible role in project management.
* The selection is explicit in `agent/settings.json` and therefore reviewable in the
  public repository — it documents what the agent can do.
* `pi-fff` in particular is load-bearing: the atlas-plus-grep retrieval order in
  [ADR-0007](./0007-derive-the-world-model-from-a-generated-atlas.md) assumes these tools
  exist.
* Nothing is permanently discarded; the excluded extensions remain installed and can be
  added by path.

### Negative Consequences

* Extensions referenced by absolute path couple this configuration to the layout of
  `~/.pi/agent` and `~/.agents`. Renaming or moving them breaks the agent silently at
  load time.
* Excluded extensions are genuinely unavailable, so working on an Elm or Rust project
  through this agent loses `/elm-review` and `/rust-review` unless the path is added.
* The selection is a judgement call made before the agent has been used, so it will need
  revision. That is expected, but it means M0's settings file is a guess rather than a
  finding.
* Deferring the loadout extension means the "available on demand" tier is manual in the
  meantime, which invites drift between intention and configuration.

## Pros and Cons of the Options

### Curated core set

* Good, because it is the smallest change that keeps the prompt relevant.
* Good, because it defers the only complex mechanism and can be revised cheaply.
* Bad, because it hard-codes a judgement that has not yet been tested in use.

### Inherit all 20

* Good, because nothing is lost and no decision is required.
* Bad, because every request pays for schemas of tools like `paper_write_html` and
  `ux-scaffold` that a PM agent will not use.
* Bad, because a large tool surface degrades tool selection quality, not just cost.

### Reimplement a minimal toolset

* Good, because the surface would be exactly what is needed and nothing else.
* Bad, because it duplicates existing work — `roadmap.ts` and `subagent` already exist and
  are in use.
* Bad, because it contradicts the project's premise of being a customised pi instance
  rather than a new harness.

### Loadout extension

* Good, because it is strictly the best end state: capability stays reachable while the
  prompt stays minimal, with activation driven by context.
* Bad, because it is machinery that depends on `exposure` and `setActiveTools` semantics
  and needs testing, at a point where the agent has not yet demonstrated that the core
  loadout is even right.
* Bad, because deferred activation is harder to reason about than a fixed list, and the
  agent's behaviour would vary by directory in ways that are hard to observe.

## Links

* [`docs/DESIGN.md`](../docs/DESIGN.md) §8 — extension loadout
* [ADR-0002](./0002-run-as-an-isolated-pi-agent-directory.md) — why the loadout can differ from the everyday agent
* [ADR-0007](./0007-derive-the-world-model-from-a-generated-atlas.md) — the search tools this depends on
