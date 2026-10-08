# 0009 — Defer a proactive daemon in favor of scheduled runs

* Status: accepted
* Deciders: Steven
* Date: 2026-10-08

## Context and Problem Statement

A recurring theme in the requirements is proactivity: the agent should surface what
matters without being asked, which is the core of the "daily briefing" idea and a large
part of the demonstration value. pi, however, is a pull-based interactive CLI. It does
nothing while no one runs it.

What is the minimum mechanism that makes the agent proactive?

## Decision Drivers

* Proactivity is a stated requirement, not a nice-to-have.
* The machine is a developer laptop: it sleeps, it moves between networks, and it is not a
  server. Anything requiring high uptime will be unreliable in practice.
* Fewer moving parts means fewer failure modes to debug while the agent itself is still
  being built.
* `pi --print` already runs a prompt non-interactively and writes the final assistant text
  to stdout, so a scheduled run needs no new code path in pi.

## Considered Options

* Scheduled non-interactive runs writing into an inbox, surfaced at next launch
* A resident process in RPC mode
* No proactive mode; interactive only
* An always-on file watcher reacting to changes

## Decision Outcome

Chosen option: "Scheduled non-interactive runs writing into an inbox, surfaced at next
launch", because it delivers the user-visible behaviour with no daemon, no port, and no
uptime requirement.

The flow:

1. launchd or cron runs `pa --print "/brief"`.
2. Output is written to `$PA_DATA_DIR/briefs/YYYY-MM-DD.md`.
3. The next interactive `pa` session reports unread briefs.

A resident RPC server is deferred to a possible v3, and only if cold-start latency proves
to be a real annoyance.

### Positive Consequences

* No process to supervise, no port to manage, no crash-recovery story.
* Works correctly on a laptop that sleeps: a missed run is simply a run that happens late
  or not at all, and the next launch surfaces whatever exists.
* Trivial to debug — the same command can be run by hand to reproduce any briefing.
* The brief is a file, so it is inspectable, diffable, and publishable as demo material.

### Negative Consequences

* **No real-time reaction.** The agent cannot respond to a file change or an incoming
  event as it happens; the finest granularity is the schedule.
* Each run pays cold-start latency and cost, with no shared context between runs.
* Scheduling on a sleeping laptop is unreliable. `launchd` `StartCalendarInterval` fires
  late and batches after wake, so "7am daily" is aspirational rather than guaranteed.
* Unread-brief detection is stateful in a small way — something must track what has been
  seen — and that state is easy to get wrong across sessions.
* Nothing detects a schedule that has silently stopped firing; the absence of a brief looks
  the same as a brief with nothing to report.

## Pros and Cons of the Options

### Scheduled runs with an inbox

* Good, because it reuses `pi --print` and needs no new runtime.
* Good, because the failure mode is benign and self-evident.
* Good, because it is legible as demonstration material — the brief is a real artifact.
* Bad, because it cannot react to events, only to the clock.

### Resident RPC server

* Good, because it eliminates cold start and permits genuine event-driven reaction.
* Good, because it would support a persistent conversational surface.
* Bad, because it requires a supervised process on a machine that sleeps, which is where
  most of the complexity would come from.
* Bad, because it front-loads infrastructure work before the agent's actual behaviour has
  proven useful.

### Interactive only

* Good, because it is the smallest possible scope and there is nothing to break.
* Bad, because proactivity is a stated requirement, and a briefing that only exists when
  requested is not a briefing.

### Always-on file watcher

* Good, because it is the most responsive option and matches the "event-driven, not
  calendar-driven" convention in `_Home.md`.
* Bad, because it requires the resident process that the previous option already struggles
  with, plus fs-watch machinery and a debounce policy.
* Bad, because for a corpus of this size and pace, reacting within seconds rather than
  within a day has no practical value.

## Links

* [`docs/DESIGN.md`](../docs/DESIGN.md) §9 — proactive layer
* M4 in `ROADMAP.md`
* `Dropbox/eapsoftware-research/_Home.md` — "event-driven not calendar-driven" convention
