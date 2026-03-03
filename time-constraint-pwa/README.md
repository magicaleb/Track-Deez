# TimeLens (Standalone PWA)

A fully standalone iPhone-friendly PWA that is intentionally separated from the existing tracking application code.

## What it does
- Manages task lifecycle (create, edit, delete, complete, reset).
- Uses available time as a filtering constraint.
- Supports optional flexible tasks when exact time fit is unavailable.
- Enables quick execution flow (start task, log minutes, complete task).
- Maintains activity logs and lightweight insights.
- Supports recurring reset behavior (daily/weekly tasks).
- Works offline using a dedicated service worker.

## Run locally
From repo root:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173/time-constraint-pwa/
```
