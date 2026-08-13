# today-in-sports-frontend

Angular 18 frontend for **Today in Sports** — a daily five-question sports
history quiz anchored to the calendar date.

Plan: `~/Code/docs/features/today-in-sports/PLAN.md`

## Scope

**Phase 1 ships the admin portal only.** There is no play surface yet. The
public quiz, scoring, leaderboards and groups land in phase 2, once the content
pipeline is proven and there is real inventory to play against.

## Panels

Structure copies `xomify-frontend/src/app/pages/admin/` — an `admin.component`
host with `*-panel/` children.

| Panel | Purpose |
|---|---|
| `review-panel` | One question at a time, with its source URL and raw stat row beside the answer. Keyboard-driven: `a` approve, `r` reject, `e` edit, `g` regenerate, `j`/`k` navigate. |
| `bank-panel` | Approved-unused inventory, filters, and a calendar heatmap of per-date coverage. |
| `schedule-panel` | Next 60 days, draft/scheduled/published, drag to swap, sport mix visible per day, publish gate. |
| `events-panel` | Detected events, filterable by detector reason and notability score. |
| `rejected-panel` | Rejections with reasons — the signal for fixing templates and detectors. |

**`review-panel` is the priority.** It is the only recurring manual cost in the
whole product, so it gets optimised before anything else. If a review session
runs slower than roughly one question per 30 seconds, fix this panel before
generating more inventory.

Showing the source URL inline is what makes review a five-second verification
rather than a research task.

## Conventions

- Angular 18, NgModules, SCSS. Not Tailwind — matches `xomtracks-frontend`.
- Named exports, strict TypeScript, early returns.
- **No emoji anywhere in the UI.** SVG or text only.
- Admin route guarded with the pattern from `xomify-frontend/src/app/guards/`.

## Local

```bash
npm install
npm start
```
