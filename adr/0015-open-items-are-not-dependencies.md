# 0015 — A project's open items are not its dependencies'

- **Status:** proposed (2026-10-11)
- **Date:** 2026-10-11

## Context

`pa-atlas` derives each project's open items from TODO markers and unchecked checkboxes in the files
it walks, and reports them per card. The walk skipped a fixed list of noise directories —
`.git`, `node_modules`, `.venv`, `vendor`, `dist`, `__pycache__` and friends — which is a guess about
where junk lives rather than a statement about what belongs to the project.

Three examples of the guess being wrong, all found in one public-repo audit:

- **`mlb-statcast-dbt` reported 33 open items, and every one was a vendored dependency's** — the
  pull-request and issue templates inside `dbt_packages/dbt_utils/.github/`, which the project itself
  ignores. Its card read *"Open items (33)"* and listed *"postgres"*, *"redshift"* and *"I have run this
  code in development"* as the owner's work.
- **`spicy` reported 146, of which 130 came from bundled Lambda package trees** under
  `backend/assets/lambda_functions/packaged/…` — installed packages with their own checklists,
  gitignored, counted as the project's tasks.
- **`clear-vial` reported 27 from generated build directories** (`.elm-land/`, `dist/`, `elm-stuff/`).

The same error also inflated the reported **size** by an order of magnitude in places: `ai-study` showed
1.9 GB and `cms-pipeline` 112 MB, because an ignored virtualenv or data directory was counted as the
project's content.

## Decision

**The scan prunes whatever the project itself ignores**, rather than relying on a hand-maintained list
of junk directory names.

- For anything that is a repository: `git ls-files --others --ignored --exclude-standard --directory`,
  resolved to paths and pruned from the walk. This honours `.gitignore`, `.git/info/exclude` and the
  user's global excludes — the project's own statement about what is not its content — and collapses
  whole ignored trees into one entry each.
- For anything that is not a repository (most of the two Obsidian vaults): the existing `SKIP_DIRS`
  behaviour is unchanged, because there is no declaration to consult.
- The prune applies to **everything the card reports** — file count, size, newest file, TODOs and
  checkboxes — since the fields describe the same project and should agree about what it contains.

The rule this makes explicit: **a project's open items are the ones it would track.**

## Consequences

**Measured as an A/B against the previous generator, same inputs at the same moment** (the earlier
before/after comparison was contaminated by content drift between sweeps, which is how this was caught):
open items across all cards **3,247 → 3,056**, with four cards affected — `spicy` −130,
`mlb-statcast-dbt` −33, `clear-vial` −27, `dim-the-lights` −1. Nothing else moved.

**The `size` field changes meaning, which is worth stating rather than discovering.** It is now the
project's own content, not the disk: `ai-study` 1.9 GB → 117 MB, `cms-pipeline` 112 MB → 504 KB.
The old figure was never about the project's work, so the change makes the field honest — but any
comparison of sizes across sweeps before and after this date is comparing two different things.

**A residual self-referential noise remains, and is recorded rather than smoothed over.** The scanner
counts a `TODO` that appears in a test fixture *as though it were a task*: adding three checks to
`tests/test-atlas.sh` raised `personal-agent`'s own count by 2. Fixing it properly means excluding the
generator's own fixtures from its own scan, which is a separate change. Until then the generator
inflates its own card slightly, and that is visible rather than surprising.

**Verification is in the acceptance test, not just in the cards.** `tests/test-atlas.sh` now has a
fixture project that vendors an ignored dependency containing a checklist, and asserts three things:
the dependency's items are absent, the project's own TODO is present, and the ignored files are absent
from the size. Fifteen checks, previously twelve.
