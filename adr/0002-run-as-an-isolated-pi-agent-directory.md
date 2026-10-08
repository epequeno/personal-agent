# 0002 — Run as an isolated pi agent directory

* Status: accepted
* Deciders: Steven
* Date: 2026-10-08

## Context and Problem Statement

`personal-agent` is a customised instance of pi. pi supports three ways to carry
configuration: the user agent directory (`~/.pi/agent`, overridable with
`PI_CODING_AGENT_DIR`), a project `.pi/` directory resolved from the working directory,
and the built-in defaults. Which one should carry this agent's identity?

The requirement is that the agent is recognisably *this* agent — same instructions, tools,
skills, and model — whether it is launched from its own directory or from inside one of
the projects it manages. A separate requirement is that the configuration is publishable,
since the repo is public and the setup is part of the demonstration.

## Decision Drivers

* Identity must not depend on the current working directory.
* Configuration must be publishable as part of the repository.
* The existing `~/.pi/agent` setup must not be disturbed — it is the everyday coding
  configuration, with 20 extensions and a curated model list.
* Reimplementing any part of the harness is explicitly out of scope.

## Considered Options

* A dedicated agent directory at `agent/`, selected by `PI_CODING_AGENT_DIR`
* A project `.pi/` directory in this repository
* Reuse `~/.pi/agent` and add configuration to it
* Fork or wrap pi as a distinct harness

## Decision Outcome

Chosen option: "A dedicated agent directory at `agent/`, selected by
`PI_CODING_AGENT_DIR`", because it is the only option that gives a cwd-independent
identity while keeping the configuration inside the repository and leaving the existing
`~/.pi/agent` untouched.

`bin/pa` sets `PI_CODING_AGENT_DIR="$PA_HOME/agent"` before exec'ing pi. Because agent
directories compose, existing skills at `~/.agents/skills` and selected extensions at
`~/.pi/agent/extensions` are referenced by absolute path rather than copied.

### Positive Consequences

* The agent has one identity regardless of where it is launched.
* The configuration is committed and publishable.
* `~/.pi/agent` continues to work unchanged for ordinary coding.
* The agent's settings, tools, and model list can diverge from the everyday setup
  without conflict.

### Negative Consequences

* Configuration is duplicated in part. Extensions and skills referenced by absolute path
  will silently break if `~/.pi/agent` or `~/.agents` is reorganised.
* `auth.json` lives in the agent directory, so credentials land inside a public
  repository. Mitigated by gitignoring `agent/auth.json` or symlinking it to
  `~/.pi/agent/auth.json` — but it is a footgun that must be handled in M0, not later.
* Two agent directories now need to be maintained, and pi package versions can drift
  between them.

## Pros and Cons of the Options

### Dedicated agent directory

* Good, because `PI_CODING_AGENT_DIR` is a supported, documented override with no
  wrapper or patching required.
* Good, because it keeps the configuration in the repository and therefore reviewable,
  diffable, and publishable.
* Good, because it isolates this agent's tool selection, which matters given that most
  of the 20 existing extensions are irrelevant to project management.
* Bad, because of the `auth.json` exposure and the partial duplication noted above.

### Project `.pi/` directory

* Good, because it is the conventional way to configure pi for a repository.
* Bad, because it only applies when the working directory is inside this repository. The
  agent is meant to be launched while working on *other* projects, which is precisely when
  it would lose its identity.
* Bad, because it conflates "configuration for working on this repo" with "the identity
  of the agent".

### Reuse `~/.pi/agent`

* Good, because there is nothing new to maintain and every existing extension and skill
  is available immediately.
* Bad, because it provides no isolation: changes made for the personal agent alter the
  everyday coding agent, and vice versa.
* Bad, because the everyday configuration is a broad coding toolset, not a narrow
  project-management one; carrying 20 extensions and their schemas into a PM agent is
  prompt cost with no benefit.

### Fork or wrap pi

* Good, because nothing is constrained by pi's configuration surface.
* Bad, because it reimplements a harness, which the project brief explicitly rules out.
* Bad, because it forfeits pi's session management, compaction, and extension ecosystem —
  all of which this design depends on.

## Links

* [Configuration](https://github.com/earendil-works/pi/blob/main/docs/configuration.md) — pi agent directory and project `.pi` behaviour
* [`docs/DESIGN.md`](../docs/DESIGN.md) §4 — identity and launch
* [ADR-0003](./0003-keep-private-data-outside-the-repository.md) — where the data goes
* [ADR-0010](./0010-curate-the-extension-loadout.md) — which extensions are inherited

---

## Updates

* 2026-10-08 — Discovered during M0 that the agent directory is **not purely
  configuration**. pi installs packages into `agent/npm/` (44 MB of `node_modules`) and
  writes runtime state to `agent/models-store.json` and `agent/pi-fff/` (LMDB databases).
  These are gitignored and only hand-written files are committed. This adds a maintenance
  obligation the decision did not anticipate: every new package needs a matching ignore
  rule, and the failure mode is committing generated state to a public repository.
