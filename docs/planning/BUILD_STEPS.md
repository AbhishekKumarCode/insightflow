> **Early planning notes, kept for the record.** The build changed after this was written (for example: deployed on Vercel, no Supabase, and no model call at request time). See the README for what was actually built.

# InsightFlow: build steps (what gets built, in order)

Reference screens: `design/README.md`. Data: `ps/BuildBattle_2026_Customer_Feedback_Dataset.csv` (7,000 rows, 320 unique, 4 categories).

## Architecture decisions
- **Stack:** Next.js (App Router, TypeScript), Tailwind, shadcn/ui, Recharts, zod, PapaParse.
- **Two-path analysis, so the demo never depends on a slow live call:**
  1. `scripts/analyze.ts` runs once on the sample CSV: dedupe, sentiment, clustering, scoring. Output is committed as `data/analyzed.json`. The sample demo loads instantly.
  2. `POST /api/analyze` runs the same pipeline on a user-uploaded CSV, on unique rows only, with progress updates.
- **Persistence:** the Vercel filesystem is read-only at runtime, so JSON files can't store user changes. Read-only data (sample analysis) lives in the repo. User-created data (added feedback, tracked issues, saved reports) goes in **browser localStorage** by default. Shared report links need a server store, so that one feature uses Supabase only if time allows. (Correction to my earlier suggestion of "local JSON files" for everything.)
- **AI:** AI SDK through Vercel AI Gateway with `generateObject` and zod schemas. I'll check the installed AI SDK docs before writing the calls, not rely on memory.
- **Adaption:** the data-cleaning stage. I read the Adaption Python API reference first. If it can't be called from the deployed app, run it once, commit the adapted output, and say so in the explanation.
- **Trends:** the dataset has no dates, so the sample gets deterministic simulated timestamps over 90 days, and the UI labels them "simulated".

## Priority score (shown in the UI)
`score = 100 x (0.40 x volume + 0.35 x negativeShare + 0.25 x severity)`
- volume = issue mentions / largest issue mentions
- negativeShare = share of the issue's reviews that are negative
- severity = 0 to 1, assigned per issue by the model (fraud and safety high, cosmetic low)

## Steps

### 1. Setup
1. `create-next-app` in `/frontend_hackathon/insightflow`, add shadcn/ui, Recharts, zod, PapaParse, AI SDK.
2. Tailwind theme from the Stitch design system (indigo #4F46E5, slate neutrals, Inter, 12px cards, 8px controls).
3. Link to Vercel, deploy the empty app, set env vars (`vercel env`).

### 2. Shell and shared components
4. App shell: 5-item sidebar (Overview, Feedback, Priorities, Tracker, Reports), "Import data" button, top bar with search, mobile bottom nav.
5. Shared components: KPI card, sentiment pill (the only red/amber/green use), neutral category chip, score badge, empty/loading/error states.
6. Types and zod schemas: `Feedback`, `Cluster`, `Issue`, `Report`.

### 3. Import and cleaning
7. `/` Import: CSV drop zone (CSV only), "Use sample data" primary button, column validation, 3-row preview.
8. Dedupe step: normalize and group identical reviews, keep counts (7,000 to 320).
9. `/clean`: Adaption results (rows before/after, quality score, detected domain/tone/language, source vs adapted rows from real data). Copy matches what Adaption really does.

### 4. Analysis pipeline
10. Sentiment: batches of about 40 unique reviews, structured output (`positive|neutral|negative` + score + topics).
11. Clustering: one call per category on its unique reviews, returning named issues and review assignments; severity per issue.
12. Fan results back out to all 7,000 rows by review text.
13. Recommendations: per top issue, given real counts and real quotes only, returning why, evidence ids, 3 actions.
14. Fallbacks: keyword sentiment if a call fails; retries; results cached.
15. `/analyzing`: progress screen driven by real stages.
16. Run `scripts/analyze.ts` on the sample and commit `data/analyzed.json`.

### 5. Feedback table
17. `/feedback`: server-side search, category/sentiment filters, sort, pagination, "Add feedback" dialog (new entries analyzed on save), Track button.

### 6. Overview
18. `/overview`: "What to fix first" (top 3), KPIs, sentiment donut, category bars, trend chart with axes and tooltip.
19. **Global filters (category, sentiment, date)** that drive every widget. Required by the brief.
20. Net Sentiment computed as positive % minus negative %, so the numbers always agree.

### 7. Priorities, tracker, reports
21. `/priorities`: ranked issues, expandable "why this matters", evidence quotes, actions, score-breakdown popover.
22. `/tracker`: kanban (New, Investigating, In progress, Resolved), drag and drop, notes; "Track issue" creates a card.
23. `/reports`: one-page report from live data, print stylesheet for PDF, CSV export; saved reports list; share link if the server store is added.

### 8. Polish and verification
24. Loading, empty and error states on every page; keyboard focus; contrast; mobile layouts.
25. Playwright smoke test of the full path: sample data, clean, analyze, overview filters, track an issue, export.
26. Fix what the test finds. Check the live URL, not just localhost.

### 9. Submission
27. README with screenshots and architecture. One-page Adaption explanation. Demo script (2 minutes or less). Final deploy.

## Needed from the user
- Adaption: credits / API key status (or approval of the run-once-and-commit fallback).
- `vercel login` (type `! vercel login` in the prompt) so I can deploy.
- AI Gateway access on the Vercel project.
- Confirmation: localStorage for tracker/reports, with Supabase only for share links if time allows.
