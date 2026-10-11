---
description: Turn a job-sweep dump into a triaged shortlist — dedupe against the Target List, apply the stated filters, order the week's applications
argument-hint: "[path to a discovered/*.md, or a focus]"
---
Turn the newest sweep into decisions. Input: ${1} — default to the newest file in
`~/Dropbox/eapsoftware-research/job-search/discovered/`.

The dump **generates claims**, it does not build a queue. It scores titles and posting text with a
rubric, and a rubric cannot know that a role is a repost, that a company is already tier A, or that
a posted range is location-adjusted. Make it decision-ready without inventing anything.

## Gather

1. The newest dump. Read it whole — the `_why_` line under each row is the script's reasoning, and
   that is what you audit.
2. `~/Dropbox/eapsoftware-research/job-search/Target List.md` — tiers, filters, tailoring nouns,
   and the *excluded, with reasons* table.
3. `_Home.md` § search lane: the 2026-10-07 filter answers (reaffirmed 2026-10-11 — regulated-env
   roles stay out). Its frontmatter says `partially-confirmed`; these are claims.
4. `job-search/Resume Draft.md` — what an application can actually claim today.
5. `"$PA_HOME/bin/pa-atlas"` only if you are about to name another project.

## Rules

- **Never run the scanner.** `discover.py` makes network calls, which are outside this agent's
  scope. You read the dumps it produced; you do not produce them.
- **Dedupe by company + normalized title**, never by URL or job id. The same role is already in the
  Target List (Deepgram's *Model Evaluation & AI Systems* is tier A **and** a dump row), and a
  repost carries a new id, so it reads as new forever. List the duplicates with the tier they
  carry — never drop one silently.
- **The stated filters outrank the score.** IC AI engineering / AI platform / MLOps only · US remote
  or DFW hybrid · US citizen, no clearance · posted top ≥ $150K · customer-facing and
  regulated-industry roles out. Where the score disagrees with a filter, follow the filter and say
  so.
- **The score is a rubric, not a verdict.** Name the signal doing too much work (e.g. `+2
  regulated/public sector`) rather than passing the ranking through.
- **Staleness is not verifiable here** unless a row carries a posted/updated date. Do not assert a
  role is open.
- Do not edit the dump, the Target List, or the resume. Output is a proposal.
- **Cap the shortlist at 12.** 86 rows sorted by a rubric is a reading list, which is what this
  prompt exists to prevent.

## Output

Write `$PA_DATA_DIR/briefs/jobsweep-<date>.md` and print the same text.

    # jobsweep <date>

    ## Apply this week        ≤5: company — role — tier — link — one line on fit — next action
    ## Already on the Target List   dump rows that duplicate it, with the tier they carry
    ## New, worth a look      ≤7, same shape
    ## Rejected               counts by filter, plus any rejection that is arguably wrong
    ## Divergence             script score vs Target List tier vs the stated filters — both sides
    ## Quiet                  one line: scanned / matched / new, and whether the header reports
                              per-board coverage (until it does, coverage is unverified)

Every row cites its dump line and, where one exists, its Target List tier.
