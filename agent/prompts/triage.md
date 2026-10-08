---
description: Triage a new project idea — position it against the corpora, score it against Steven's goals, and decide whether to start it
argument-hint: "<the idea, in a paragraph>"
---
Triage this idea: ${1}

The idea arrives with its own framing about why it is good. That framing is a **claim**.
Your job is not to judge the idea on its own terms — it is to find what already exists that
overlaps it, what it would displace, and which goal it genuinely serves. An idea that sounds
novel and is already designed in the vault is not novel.

## Gather

1. Regenerate the atlas: run `"$PA_HOME/bin/pa-atlas"` (deterministic, free). Read
   `$PA_DATA_DIR/atlas/index.md`; open cards only for projects you are about to name.
2. Read `~/Dropbox/eapsoftware-research/_Home.md` (priority hub — **claims**, frontmatter
   `partially-confirmed`) and `~/Dropbox/eapsoftware-research/_Research Triage.md`.
3. Search the corpora for the idea's key terms *before* judging overlap.

**Prove the search works.** `fff_multi_grep` returns false nulls against the research vault
(2026-10-08: no hits for terms that certainly exist). Use `rg` with
`--glob '!**/.venv/**' --glob '!**/.git/**'`, and run a control term that must hit before
trusting any null result. A null from an unverified tool is not evidence.

Overlap is checked against all four layers, not just the active one: `~/code` (~44 projects)
· the research vault's ~48 dirs, including **~25 designed-only projects** · the parked list
(`_Home.md` § 6) · `_Research Triage.md`.

## The goal model

Read this off `_Home.md` § 8 and **state its confirmation status** — do not assume it:

- **Dominant, confirmed:** land an **AI Engineer** role (IC + platform/MLOps; not
  customer-facing; US citizen, no clearance; remote or DFW hybrid; $150K–$180K floor).
- **Confirmed:** search first. Other work counts only where it produces **public citable
  evidence**.
- **The differentiator:** evals and agents. A strong project in a saturated area is worth
  less than a modest one in evals.
- **Not a goal:** EAP as a business — § 8.4 denies "helps EAP" as a reason on its own.
- Decisions 5–7 are **proposed defaults**, not settled. If the verdict turns on one, say so.

If the verdict would invert under a different goal model, ask Steven to confirm or correct
it. Never triage against a goal model you have silently assumed.

## The frame — five parts, in this order

### Positioning (first, always)
Name the closest prior work by project and path. Then answer the question that decides the
rest: **duplicate, substitute, or complement?**

Overlap is not substitution. `rag-architecture-eval` (code retrieval on CoIR/CodeSearchNet,
retrieval-only) and `rag-eval-project` (prose MultiHop-RAG, end-to-end with judge meta-eval)
looked like substitutes and were not; that mistake cost a reversed decision (§ 8.3). If the
idea already exists as a **design** in the vault, say so and quote it. Check related
projects' literature lists too — an idea may be a known, deliberately unbuilt arm
(`rag-architecture-eval/docs/Literature.md` files ColBERT as `[Secondary]`).

### Goal service
Which gate item does it move (resume / target list / warm contacts / public profile README),
or which goal does it advance? **Public citable evidence, or only private capability?** Name
the mechanism concretely; prefer a claim you can cite over a plausible story. The strongest
form of this argument is an already-written gate item that the idea closes.

### Displacement
**One build artifact in flight** (`data-role-transition` ADR 0010). Every "start this" is a
"stop that". Name what stops. If nothing can stop, the verdict is `queue`, not `now`. Work
that fits *inside* the artifact already in flight displaces nothing — that is the cheapest
good answer, so look for it before proposing a repo.

### Verdict
Exactly one of `now` / `queue #n` / `park` / `decline`, then **one concrete next action**
small enough to start in this session.

### Divergence
Anything the idea asserts about current state that the atlas, git state, or a file timestamp
contradicts — plus any place the hub's own sections disagree with each other. Report both
sides. Never reconcile silently.

## Verifying an "it will be quick" claim

Ideas usually arrive with a speed claim. Check the tool, not the pitch: last commit date,
whether CI still runs, open issue count, dependency pins, and what the maintainers' own
release notes say. A library whose last push was months or years ago, that has removed its
CI, and whose release notes say "fix dependency hell" is not evidence of a quick path.
Report the friction as a finding: a documented slog is better content than an unverified
"easy", and a time-boxed spike produces a publishable result either way.

## Rules

- Evidence beats claims. Cite atlas fields, file paths, or commit shas. No evidence, no statement.
- Do not edit `_Home.md`, `_Research Triage.md`, or any corpus file. The only file you write
  is the triage note.
- Parked means parked. Never propose resuming parked work — ask.
- Qualify ADR references by project (`data-role-transition` ADR 0010).
- Be short. Under 50 lines. Lead with the verdict when the reasoning runs long.

## Output

Write `$PA_DATA_DIR/triage/YYYY-MM-DD-<slug>.md` and print the same text.

    # <idea> — triaged YYYY-MM-DD

    ## Verdict
    now | queue #n | park | decline — the one next action, and what it displaces.

    ## Positioning
    Closest prior work (project + path). Duplicate / substitute / complement, and why.
    What is genuinely new, if anything.

    ## Goal service
    Gate item or goal advanced; public evidence vs private capability; the mechanism.

    ## Displacement
    What stops, by name. Or "nothing — it fits inside <artifact>".

    ## Divergence
    Claims vs. evidence, both reported. "None found" is a valid answer.

Close with `atlas: <N> projects, generated <timestamp>` so the triage's freshness is checkable.
