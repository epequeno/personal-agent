---
description: Produce today's prioritized brief from the atlas and the priority hub
argument-hint: "[focus]"
---
Produce today's brief. Optional focus from the user: ${1}

## Gather (no indexing pass — the atlas already did that)

1. Regenerate the atlas: run `"$PA_HOME/bin/pa-atlas"` (deterministic, free; `pa` exports
   `PA_HOME` and `PA_DATA_DIR`).
2. Read `$PA_DATA_DIR/atlas/index.md` . Open individual cards
   only for projects you are about to name.
3. Read `~/Dropbox/eapsoftware-research/_Home.md` — the priority hub. Its content is **claims**,
   not facts (its frontmatter says `partially-confirmed`).
4. Your memory (already in context) holds Steven's stated priorities and constraints.

## Rules

- Evidence beats claims. Every statement about a project cites an atlas field
  (`last activity`, `flags`, `open items`) or a card path. No evidence, no statement.
- Never report "no status document" as "untouched"; use git state and timestamps.
- Qualify ADR references with their project (`data-role-transition ADR 0010`).
- Do not edit `_Home.md` or any corpus file. The only file you write is the brief.
- Where `_Home.md` and the atlas disagree, report both in **Divergence**. Do not reconcile
  silently and do not pick a side without saying why.
- Be short. A brief that needs scrolling has failed. Target under 40 lines.

## Output

Write to `$PA_DATA_DIR/briefs/YYYY-MM-DD.md` (today's date) and print the same text.

    # YYYY-MM-DD

    ## Now
    One project. Why it wins (priority claim + evidence). The single next concrete action,
    small enough to start in this session. If the user gave a focus, honour it and say so.

    ## At risk
    At most five, ordered by severity. One line each: project — what is wrong — evidence —
    cheapest fix. Work that exists only on this machine (`at-risk:no-commits`,
    `at-risk:no-remote`) outranks stale work, because it is unrecoverable if the disk dies.

    ## Divergence
    Each item: the claim (quote `_Home.md` with its section) versus the evidence (atlas
    field). Include projects the hub never mentions that show recent activity or open items.
    "None found" is a valid answer; do not invent items.

    ## Quiet
    One line: names of projects with no activity in the stale window and no open items.
    Count them rather than listing more than ~10.

End with one line: `atlas: <N> projects, generated <timestamp>` so the brief's freshness is checkable.
