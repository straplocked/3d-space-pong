# DOC_UPDATE.md

Maintenance spec for this project's documentation. Every time the "doc update" prompt is run, this file's counter is bumped and a dated entry is appended to [docs/CHANGELOG.md](./docs/CHANGELOG.md) — never to this file itself.

---

## Run counter

**Run count: 5**
**Last run: 2026-09-30**

*(Only the counter and last-run date change here per run. Change narrative goes in `docs/CHANGELOG.md`.)*

---

## Purpose

The `docs/` tree is the canonical starting point for every new conversation on this repo. Claude (and any human reader) reads [docs/README.md](./docs/README.md) first to orient, then follows the ToC into the specific page that matches the task.

This file exists to:

1. Keep the documentation aligned with the code over time.
2. Track **how often** the docs have been refreshed (the counter below).
3. Define **how** to split large doc pages when a source file outgrows a single page of prose.

---

## Audiences

Every doc must be written for exactly one of three audiences:

| Audience | Folder | Voice |
| --- | --- | --- |
| Technical | `docs/technical/` | Developer-oriented. File paths, function names, line references are welcome. |
| User | `docs/user/` | Player / self-hoster voice. No code. |
| Leadership | `docs/leadership/` | One-page executives. Tradeoffs, footprint, tech-choice rationale. |

If a doc doesn't clearly fit one of the three, that's a signal to split it.

---

## Folder layout

```
docs/
├── README.md                      # top-level index
├── CHANGELOG.md                   # dated log of every doc-update run
├── technical/
│   ├── README.md                  # technical ToC
│   ├── architecture.md
│   ├── shared/
│   │   └── schemas-reference.md
│   ├── server/
│   │   ├── README.md
│   │   ├── api-reference.md
│   │   ├── database-schema.md
│   │   ├── leaderboard-queries.md
│   │   ├── seed-and-migrations.md
│   │   └── environment.md
│   └── web/
│       ├── README.md
│       ├── game-engine-overview.md      # ToC for the PongGame split
│       ├── game-engine-scene.md
│       ├── game-engine-physics.md
│       ├── game-engine-fx.md
│       ├── ai.md
│       ├── input.md
│       ├── router-lifecycle.md
│       ├── devpanel-overview.md         # ToC for the devpanel split
│       ├── devpanel-controls.md
│       ├── devpanel-persistence.md
│       ├── ui-screens.md
│       ├── content-quips.md
│       └── audio.md
├── user/
│   ├── README.md
│   ├── getting-started.md
│   ├── controls.md
│   ├── game-modes.md
│   ├── ai-difficulty.md
│   ├── leaderboard-guide.md
│   └── self-hosting.md
└── leadership/
    ├── README.md
    ├── executive-summary.md
    ├── product-overview.md
    ├── tech-stack.md
    ├── architecture-at-a-glance.md
    └── operational-footprint.md
```

---

## Split-file rule

When a source file would require more than ~300 lines of prose to document honestly, **split its documentation** and provide a ToC page:

1. Pick an entry-point filename ending in `-overview.md`.
2. List sub-pages in a table at the top: section title, filename link, one-sentence summary, approximate source-line range.
3. Each sub-page opens with a breadcrumb line linking back to the overview: `> [Back to <overview>](...md)`.
4. Try to keep sub-pages under 300 lines each. It's fine if they're shorter.

Currently-split files:

| Source file | Lines | Split into |
| --- | --- | --- |
| [packages/web/src/game/PongGame.ts](./packages/web/src/game/PongGame.ts) | 1130 | `game-engine-overview.md` + `game-engine-scene.md` + `game-engine-physics.md` + `game-engine-fx.md` |
| [packages/web/src/ui/devpanel.ts](./packages/web/src/ui/devpanel.ts) | 371 | `devpanel-overview.md` + `devpanel-controls.md` + `devpanel-persistence.md` |

If [main.ts](./packages/web/src/main.ts) or any other file grows past ~400 lines of meaningful logic on a future run, split its corresponding doc similarly.

---

## Link and path conventions

- Every doc link uses **relative** Markdown links that resolve when browsing locally on GitHub or a static-file server.
- Links to source code use repo-relative paths (e.g., `../../packages/web/src/game/PongGame.ts` from a `docs/technical/web/*.md` file).
- Don't link to line numbers in source unless a specific line is load-bearing — line numbers drift fast.

---

## Re-run protocol

Every time the doc-update prompt fires:

1. **Re-scan the codebase.** Inventory file counts, line counts, any new routes / schemas / subsystems.
2. **Diff against existing docs.** Update any page that describes code that has since changed.
3. **Apply the split rule.** If a source file has crossed the ~300-line threshold, split its doc and add a ToC.
4. **Increment this counter.** Bump `Run count` by 1 and set `Last run` to today's absolute date (YYYY-MM-DD, from the environment's `currentDate`, not a relative phrase).
5. **Append to `docs/CHANGELOG.md`.** One dated entry per run, under a heading `## Run #N — YYYY-MM-DD`. List files added / updated / removed; note any threshold crossings; note any new routes, schemas, or subsystems documented for the first time.
6. **Do not** write narrative change entries into this file. The only diff to `DOC_UPDATE.md` on a normal run is the counter bump.

If the **split rule itself changes**, or the folder layout is restructured, update the relevant section above and note it in the changelog.

---

## Session-start scanning

A project memory entry is written at `/home/straplocked/.claude/projects/-home-straplocked-dev-3d-space-pong/memory/project_docs_autoscan.md` that instructs Claude to read [docs/README.md](./docs/README.md) at the start of each session (when the user's question involves code or product context). Repeat for every new session. If that memory ever goes stale, re-create it per the instructions in the memory system.

---

## Verification

After a run:

- `ls docs/` shows `README.md`, `CHANGELOG.md`, `technical/`, `user/`, `leadership/`.
- `grep "Run count" DOC_UPDATE.md` returns a number ≥ 1.
- `head docs/CHANGELOG.md` shows the newest entry first.
- Sub-pages of split files are all under ~300 lines (`wc -l docs/technical/web/game-engine-*.md`, `wc -l docs/technical/web/devpanel-*.md`).
- Every internal doc link resolves (no 404s).
