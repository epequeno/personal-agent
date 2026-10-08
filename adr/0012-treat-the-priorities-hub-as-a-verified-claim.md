# 0012 — Treat the priorities hub as a verified claim, not ground truth

* Status: accepted
* Deciders: Steven
* Date: 2026-10-08

## Context and Problem Statement

Mechanical derivation has a hard limit: an atlas can report that a repository has no
commits, but it cannot know that the work is *parked on purpose*, that one research project
is the current flagship, or that the AE/DE track was deliberately abandoned. That knowledge
exists only in human-authored documents.

The most current of those is `~/Dropbox/eapsoftware-research/_Home.md` — verified as the
newest tracker in the vault, and by its own statement the entry point across the three
areas that hold Steven's plans. It contains a priorities table, a build queue, a search
lane, parked-item pointers, and a decisions log.

But it is not ground truth:

* Its frontmatter reads `status: partially-confirmed`, and § 8 lists decisions 2, 5, 6 and
  7 as still-proposed defaults.
* It self-declares its scope: *"Not reviewed: loose files in `~/code` … and the other ~25
  repos in `~/code` (rfx-engine, dosage-calc, clear-vial, castle, etc.)."* It is
  authoritative for the job-search, research, and EAP tracks — not a complete tracker of
  `~/code`, which is exactly what this agent was asked to know about.
* It is already stale in places. `tabular-qa-agent-eval/` (modified 20:41 on 2026-10-07)
  and `research-skills-guide.md` (06:14 on 2026-10-08) both postdate its content and are
  absent from it.
* It is newer than some documents it describes — § 5.1 notes that the EAP roadmap's header
  says "last updated 2026-03-15" and is probably stale.

A further complication: **ADR numbers are per-project namespaces.** `_Home.md` refers to
"ADR 0010" and "ADR 0011", which resolve to `data-role-transition/adr/`. At least eight
independent ADR directories exist across the corpora (`data-role-transition`,
`legal-kit/docs/architecture/adrs`, `medcheck/docs/decisions`,
`eap-software/docs/eap-software/ADR`, `clear-vial`, `mlb-statcast-dbt`,
`keystone-cms-pipeline`, `cms-pipeline`, `nyc-tlc-analytics-case-study`). An unqualified
"ADR 0011" is ambiguous and will be resolved incorrectly by default.

How should the agent treat the priorities hub?

## Decision Drivers

* Human intent — why something is parked, which artifact is in flight — cannot be derived
  mechanically, so the document is necessary.
* The document demonstrably goes stale within hours, so it cannot be trusted silently.
* Verification against filesystem and git evidence is cheap and fully local.
* Surfacing a divergence is itself the product: "the doc claims X, the evidence says Y" is
  precisely the cross-project PM value Steven is asking for.
* `roadmap.ts` already implements the audit pattern — verifying that completed items are
  actually implemented. This decision generalises it from one file to the whole world model.

## Considered Options

* Two layers: read the priorities hub, but verify it against evidence and surface divergence
* Treat the priorities hub as ground truth
* Ignore human-authored documents entirely; derive everything mechanically
* Replace the priorities hub with a generated document

## Decision Outcome

Chosen option: "Two layers: read the priorities hub, but verify it against evidence and
surface divergence", because it preserves knowledge that cannot be derived while refusing
to propagate claims that may be wrong.

The world model therefore has two layers with different trust properties:

| Layer | Source | Trust |
|---|---|---|
| Priority | `_Home.md`, roadmaps, project notes — human-authored | Read as **claims**; verified before use |
| Evidence | The generated atlas, git state, file timestamps, session history | Factual but intent-blind |

Rules that follow from this:

* **Verify before asserting.** A claim taken from the priorities hub is checked against the
  evidence layer before it is repeated as fact. "Published" means the remote exists;
  "dormant since March" means the commit log agrees.
* **Surface divergence, do not silently reconcile it.** When the document and the evidence
  disagree, report both. Do not update the document to match the evidence.
* **Never edit the priorities hub unless explicitly asked.** It is Steven's document, not
  the agent's output.
* **Qualify every ADR reference with its project.** "ADR 0011" is meaningless without a
  namespace; resolve it relative to the project whose documents are being read.
* **Prefer the evidence layer for anything structural**, and the priority layer for
  anything involving intent, sequencing, or justification.

### Positive Consequences

* Human intent is available without being trusted blindly.
* Stale claims are caught rather than propagated, which is a visible, demonstrable
  behaviour — and the same audit pattern already proven by `/roadmap audit`.
* The agent can answer "what should I work on" while respecting the stated conventions,
  such as one build artifact in flight and event-driven rather than calendar-driven
  sequencing.
* Refusing to edit the priorities hub keeps the human and agent artifacts clearly separated.

### Negative Consequences

* Verification costs tokens and time on every run that uses the priority layer. A brief
  that verifies everything is more expensive than one that asserts.
* Verification will produce false positives. A file's modification time is not progress; a
  repository with no recent commits may be complete rather than abandoned. Over-reporting
  divergence is a real risk and creates noise the user learns to ignore.
* Divergence reporting can read as pedantic when the document is only slightly behind, so
  the threshold for raising it requires judgement.
* The rule that the hub is never edited means known staleness persists until Steven fixes
  it. The agent can propose a correction but not apply it.

## Pros and Cons of the Options

### Two layers, verified

* Good, because it is the only option that keeps un-derivable intent while refusing to
  propagate unverifiable claims.
* Good, because the divergence report is itself the useful output.
* Bad, because verification is expensive and imperfect, and its errors are visible.

### Ground truth

* Good, because it is simple, cheap, and fast — read the document and repeat it.
* Bad, because the document is explicitly only partially confirmed and already behind
  reality, so the agent would confidently repeat things that are false.
* Bad, because the agent's credibility is its main asset; one confidently wrong claim about
  a published repository undermines everything else it says.

### Ignore human documents, derive mechanically

* Good, because it is fully reproducible and immune to staleness, and every claim is
  traceable.
* Bad, because intent is unrecoverable. The atlas would report a dormant repository where
  the truth is a deliberately parked one, and would treat the abandoned AE/DE track as
  simply another body of work.
* Bad, because it discards the document structure Steven already maintains, duplicating
  effort for a worse result.

### Replace the hub with a generated document

* Good, because it would always be current by construction.
* Bad, because generated documents cannot contain confirmed human decisions — the very
  content of § 8 — so the most important part would have nowhere to live.
* Bad, because it takes ownership of a document that is Steven's to author, and the
  generated version would overwrite editorial judgement with mechanical summary.

## Links

* [`docs/DESIGN.md`](../docs/DESIGN.md) §5 — world model
* [ADR-0007](./0007-derive-the-world-model-from-a-generated-atlas.md) — the evidence layer
* [ADR-0011](./0011-limit-v1-scope-to-the-three-local-corpora.md) — why EAP is reached through documents
* `~/Dropbox/eapsoftware-research/_Home.md` — the priorities hub
* `~/Dropbox/eapsoftware-research/data-role-transition/adr/` — an example of a separate ADR namespace

---

## Updates

* 2026-10-08 — Recorded the ADR-namespace rule as an explicit consequence of this decision,
  after finding at least eight independent ADR numbering schemes across the corpora.
