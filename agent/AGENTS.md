# personal-agent — world model

Loaded as a context file for every session in this agent. Describes the shape of the world,
not the design. Design lives in `docs/DESIGN.md`; rationale in `adr/`.

## Corpora

| Corpus | Path | Nature |
|---|---|---|
| Code | `~/code` | 45 directories, 33 of them git repos (56 entries in total, including loose files and archives). **Every** top-level directory counts as a project, repo or not. |
| Research | `~/Dropbox/eapsoftware-research` | Obsidian vault: 41 project directories plus `paper-watch/` (197 files). Not a git repo. |
| Personal | `~/Dropbox/obsidian/Personal` | Obsidian vault of notes rather than projects. Not a git repo. |

Counts verified 2026-10-08. Re-derive them rather than trusting them as they drift.

Two of the three have no local version control and rely on Dropbox version history. This is
why corpus writes are journaled (ADR-0005) and why the vaults are not turned into repos
(ADR-0008).

## Priority layer

`~/Dropbox/eapsoftware-research/_Home.md` is the priority hub: entry point, build queue,
search lane, parked-item pointers, decisions log. Its frontmatter reads
`partially-confirmed`.

It is authoritative for the job-search, research, and EAP tracks, and explicitly **does not**
cover all of `~/code`. Treat it as claims to verify (ADR-0012), not as ground truth.

Per-project status documents are **scarce**. Across `~/code` and the research vault there
are 16 roadmap-ish markdown files covering roughly 10 projects — and **zero in the research
vault**. For most projects there is simply no status document to read.

Consequence: derive status from git state, file timestamps, and open TODOs. A roadmap, when
one exists, is a bonus rather than the baseline. Do not report "no status" as though the
project were untouched.

## Repos with no commits

Five repositories in `~/code` have never been committed: `legal-kit`, `personal-agent`,
`personal-site`, `pipeline-monitor`, `rag-eval-project`. Nothing in them can be on a remote,
so they are the highest-risk work in the corpora. `_Home.md` independently flags four of
them, which is a useful cross-check of its claims.

## ADR namespaces

ADR numbers are per-project. Known schemes:

    data-role-transition/adr
    eap-software/docs/eap-software/ADR
    legal-kit/docs/architecture/adrs
    medcheck/docs/decisions
    clear-vial/docs/clear-vial/adr
    mlb-statcast-dbt/adr
    keystone-cms-pipeline/adr
    cms-pipeline/adr
    nyc-tlc-analytics-case-study/adr
    personal-agent/adr          (this repository)

Always qualify: "data-role-transition ADR 0011", never "ADR 0011".

## Output formats

Briefs go to `$PA_DATA_DIR/briefs/YYYY-MM-DD.md`.

    # <date>

    ## Now
    The single thing to work on, and why.

    ## At risk
    Stale, blocked, or contradicting a recorded priority.

    ## Divergence
    Claims from the priority layer that the evidence contradicts.

    ## Quiet
    Projects with no activity and no open items.

## Not reviewed by the priority hub

`_Home.md` names roughly 25 `~/code` repos it has never assessed (`rfx-engine`,
`dosage-calc`, `clear-vial`, `castle`, …), plus loose files at the `~/code` root
(`PROJECT_OUTLINE.md`, `integration-strategy.md`, `DYNAMODB_GUIDANCE.md`,
`ELM_GUIDANCE.md`, `frontend-design-resources.md`, `justfile`,
`cleanup-lambda-artifacts.sh`). These are legitimate work for the atlas to cover, and the
highest-value gap the agent can close.
