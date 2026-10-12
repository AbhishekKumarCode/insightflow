> **Early planning notes, kept for the record.** The build changed after this was written (for example: deployed on Vercel, no Supabase, and no model call at request time). See the README for what was actually built.

# InsightFlow: 1-Day Build Plan (Build Battle 2026)

Goal: ship a deployed, demoable app in ~24 hours. Cut scope before cutting polish.

## Inputs (in `ps/`)
- `Problem_Statement.pdf`: build InsightFlow, a customer feedback and decision platform.
- `Adaption Documents.pdf`: links to the Adaption deck and docs.
- `BuildBattle_2026_Customer_Feedback_Dataset.csv`: 7,000 rows, columns `review`, `category`. Only 320 unique reviews. No dates or sentiment.

## Evaluation criteria (from the Unstop post) and how we earn each
| Criterion | Weight | What we do |
|---|---|---|
| Functionality & User Experience | 25% | One smooth path: import, clean, analyze, decide, track, export. No dead buttons; loading/empty/error states everywhere |
| UI/UX & Design | 20% | Stitch design system, consistent spacing/type, responsive, dashboard that reads at a glance |
| Problem Understanding | 15% | Frame it as "feedback to decisions", not "feedback to charts". Explain the priority formula and why each issue matters |
| Innovation & Creativity | 15% | Adaption cleaning stage with visible before/after; explainable priority score with evidence quotes |
| Technical Implementation | 15% | Typed schemas (zod), analyze unique rows then fan out, caching, fallback when the LLM fails, clean repo + README |
| Presentation & Demo | 10% | 2-minute video following the demo script; one-page Adaption explanation |

Experience and design together are 45% of the score. Protect polish time over extra features.
The post says to "use AI where it genuinely improves your solution", so Adaption must visibly improve the analysis, not be bolted on.

Timing: announced 11 October, 48-hour window. Confirm the exact start/end time on the Unstop page and put the deadline at the top of this file.

## Requirements checklist (what judges score)
- [ ] Submit feedback + import CSV + search/filter + sample data
- [ ] AI analysis: sentiment, topics, clusters, **Adaption used meaningfully**
- [ ] Dashboard: KPIs, sentiment, top issues, trends, filters
- [ ] Recommendations: prioritized issues with "why"
- [ ] Save/track issues + export/share report
- [ ] Responsive, polished UI
- [ ] Deliverables: live URL, repo, short demo, Adaption explanation

## Decisions made (to move fast)
- Stack: Next.js (App Router) + Tailwind + shadcn/ui + Recharts, deployed on Vercel.
- Storage: Supabase Postgres if quick to set up, otherwise a JSON file store. Decide in hour 1 and do not revisit.
- AI: LLM through Vercel AI Gateway with structured output (zod). Analyze the ~320 unique reviews only, then map results back to all 7,000 rows.
- Adaption: Prompt Deduplication + quality evaluation as the data-cleaning stage. If the API is not callable from the deployed app, run it once offline, commit the adapted output, and explain that honestly.
- Design: Google Stitch. One design system, 6 screens, then build.
- Trends: the data has no dates, so sample data gets generated timestamps (labeled as such). New feedback uses real timestamps.

## Schedule

### Block 1: Setup + Design (hours 0-3)
1. Sign in to Adaption with the invitation email. Check credits. Create an API key if available. Join Discord.
2. `npx create-next-app@latest insightflow --ts --tailwind --app`, then `npx shadcn@latest init`.
3. `npm i recharts papaparse zod lucide-react ai`
4. Push to GitHub, deploy to Vercel (empty app live from hour 1).
5. Stitch: create project "InsightFlow", create a design system (one accent, neutrals, one font pair, radius, spacing), apply to all screens.
6. Generate Stitch screens:
   1. Upload / landing (drag-drop CSV, "Use sample data", pipeline strip: Import, Clean, Analyze)
   2. Data cleaning (Adaption): rows before/after, quality score, domain/tone, side-by-side rows
   3. Feedback explorer: table, search, filters, add-feedback dialog
   4. Dashboard: KPI cards, sentiment donut, category bars, trend line, top issues, global filters
   5. Priorities: ranked issues, expandable "why this matters" with evidence quotes
   6. Tracker (kanban) + Report page
7. Generate variants of the dashboard, pick one, fix details with edit. Check mobile view.

### Block 2: Data + Core UI (hours 3-8)
1. App shell: nav, theme, layout.
2. CSV import: PapaParse, zod validation (`review`, `category`), clear errors.
3. Persist feedback. Seed with sample data (a built-in subset of the CSV).
4. Feedback explorer: search, filter by category/sentiment, sort, server-side pagination.
5. Add-feedback form (timestamp = now).

### Block 3: Adaption stage (hours 8-11)
1. Read the Adaption Python API reference. Note upload / adapt / run / download calls and auth.
2. Run the CSV through Prompt Deduplication + quality evaluation (`review` as the prompt column).
3. Store the adapted output. Build the cleaning screen from the real numbers.
4. Write down for the explanation: what ran, before/after numbers, why it helped.

### Block 4: AI analysis (hours 11-15)
1. For each unique review: sentiment (+score), 1-3 topics, severity, via `generateObject` with a zod schema. Batch ~20 per request, run in parallel, cache results.
2. Keyword-based sentiment fallback if the LLM call fails.
3. Cluster within each category (embeddings or LLM-named groups). Store cluster name + count.
4. Map results back to all 7,000 rows.

### Block 5: Dashboard + Trends (hours 15-18)
1. KPIs, sentiment distribution, category breakdown, top recurring issues from real data.
2. Trend chart (volume + sentiment over time) with period comparison.
3. Global filters (category, sentiment, date) that drive every chart.

### Block 6: Recommendations + Tracker + Report (hours 18-22)
1. Priority score per cluster: volume, negative share, severity weight (fraud above delivery delay). Show the formula in the UI.
2. LLM recommendation per top issue, given real counts and quotes so it cannot invent numbers. Show: action, why it matters, expected impact, evidence.
3. "Track this issue" creates a record (status, owner, notes). Kanban columns: New, Investigating, In progress, Resolved.
4. Report page: executive summary, charts, top issues, recommendations. Export via print-to-PDF stylesheet and CSV of issues. Shareable read-only link by report ID.

### Block 7: Polish + QA (hours 22-24)
1. Loading skeletons, empty states, error states on every screen.
2. Mobile/tablet check, keyboard navigation, contrast.
3. Run the full demo path on the deployed URL: import, clean, analyze, dashboard, track, export.

### Submission (leave the final hour)
1. README: screenshots, features, stack, setup, architecture.
2. Adaption explanation (one page): problem (duplicated data), what was run, numbers, impact.
3. Demo video (2 min or less): problem, upload, cleaning, dashboard, a prioritized issue and its reasoning, tracking it, exporting the report.
4. Verify live link, repo, and video are accessible. Submit early.

## Cut list (drop in this order if behind)
1. Shareable link (keep print/CSV export)
2. Drag-and-drop on the kanban (use a status dropdown)
3. Period comparison on the trend chart
4. Clustering by embeddings (use LLM-named groups)
5. Dark mode

Never cut: cleaning screen (Adaption), dashboard, prioritized recommendations with reasoning, deployed URL, demo video.

## Rules to remember
- All work must fall inside the official 48-hour window. Check whether planning/design before the official start is allowed.
- Individual participation. You must be able to explain every part of the code.
- Be honest in the demo about generated timestamps and about anything Adaption ran offline.

## Open items
- [ ] Adaption credits / API key confirmed
- [ ] Adaption API reference read (calls, auth, deployability)
- [ ] Storage choice (Supabase vs JSON)
- [ ] Style direction for the Stitch design system
- [ ] Details of the earlier Razorpay problem statement, if anything should be reused
