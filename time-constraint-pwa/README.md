# TimeLens (Standalone PWA)

A fully standalone iPhone-friendly PWA separated from the repository's existing tracking app code.

## App structure
- `index.html` → **Do Now** page for low-friction execution.
- `setup.html` → **Setup** page for creating/managing tasks and reviewing logs/insights.

## Core behavior
- Task lifecycle: create, edit, delete, complete, reset, enable/disable.
- Time-aware surfacing based on available minutes.
- Flexible-task fallback when strict matches are unavailable.
- Quick execution controls (`Start`, `+5m`, `+15m`, `Done`).
- Recurring reset support for daily/weekly tasks.
- Local persistence + offline support via dedicated service worker.

## Run locally
```bash
python3 -m http.server 4173
```
Open:
- `http://localhost:4173/time-constraint-pwa/index.html`
- `http://localhost:4173/time-constraint-pwa/setup.html`
