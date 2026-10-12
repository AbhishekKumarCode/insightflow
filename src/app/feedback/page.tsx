"use client";
import { useMemo, useState } from "react";
import { Download, X } from "lucide-react";
import { filterReviews, issueById, fmt, pct } from "@/lib/data";
import { csvRow, downloadFile } from "@/lib/csv";
import { useApp } from "@/lib/store";
import { Card, PageHead, SentimentPill, Chip, btn } from "@/components/ui";
import { FilterBar } from "@/components/filters";

const PAGE = 12;
const STRIPE = { positive: "#10b981", neutral: "#f59e0b", negative: "#f43f5e" };
type Sort = "count" | "negative" | "text";
const SENTIMENTS = [["all", "All"], ["negative", "Negative"], ["neutral", "Mixed"], ["positive", "Positive"]] as const;

/** Highlights the first match of the search text inside a review. */
function Hl({ text, q }: { text: string; q: string }) {
  const t = q.trim();
  const i = t ? text.toLowerCase().indexOf(t.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="rounded bg-amber-100 px-0.5 text-inherit">{text.slice(i, i + t.length)}</mark>{text.slice(i + t.length)}</>;
}

export default function Feedback() {
  const { filters, setFilters, resetFilters, tracked, track } = useApp();
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<Sort>("count");
  const [view, setView] = useState<"reviews" | "issues">("reviews");

  const rows = useMemo(() => filterReviews(filters).sort((a, b) =>
    sort === "text" ? a.r.text.localeCompare(b.r.text)
    : sort === "negative" ? (Number(b.r.sentiment === "negative") - Number(a.r.sentiment === "negative")) || b.w - a.w
    : b.w - a.w), [filters, sort]);
  // Counts for the sentiment chips ignore the sentiment filter itself, so every chip shows what clicking it would give.
  const counts = useMemo(() => {
    const c = { all: 0, positive: 0, neutral: 0, negative: 0 };
    for (const { r, w } of filterReviews({ ...filters, sentiment: "all" })) { c.all += w; c[r.sentiment] += w; }
    return c;
  }, [filters]);
  const total = rows.reduce((a, x) => a + x.w, 0);
  const maxW = Math.max(1, ...rows.map((x) => x.w));
  const mix = { positive: 0, neutral: 0, negative: 0 };
  rows.forEach(({ r, w }) => (mix[r.sentiment] += w));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const p = Math.min(page, pages - 1);
  const slice = rows.slice(p * PAGE, p * PAGE + PAGE);

  const groups = useMemo(() => {
    const m = new Map<string, { id: string; mentions: number; neg: number; items: typeof rows }>();
    for (const x of rows) { const g = m.get(x.r.issue) ?? { id: x.r.issue, mentions: 0, neg: 0, items: [] }; g.mentions += x.w; if (x.r.sentiment === "negative") g.neg += x.w; g.items.push(x); m.set(x.r.issue, g); }
    return [...m.values()].sort((a, b) => b.mentions - a.mentions);
  }, [rows]);

  const exportRows = () => downloadFile("insightflow-feedback.csv", [csvRow(["Review", "Category", "Issue", "Sentiment", "Mentions"]), ...rows.map(({ r, w }) => csvRow([r.text, r.category, issueById(r.issue).name, r.sentiment, w]))].join("\n"), "text/csv");
  const canTrack = (r: (typeof rows)[number]["r"]) => issueById(r.issue).polarity === "negative" && r.sentiment === "negative";
  const isTracked = (id: string) => tracked.some((t) => t.issueId === id);

  return (
    <>
      <PageHead title="Feedback" sub="Every distinct review, with how many customers said it. The bar is how often it was repeated." />
      <FilterBar />

      <Card className="!p-0 overflow-hidden">
        {/* Summary and controls: one line of numbers, one row of chips, one row of options */}
        <div className="border-b border-slate-200/70 px-4 pb-3 pt-4 md:px-5">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <p className="text-sm text-muted"><b className="font-display text-xl font-semibold tabular-nums text-ink">{fmt(rows.length)}</b> distinct reviews <span aria-hidden>·</span> <b className="font-semibold tabular-nums text-ink">{fmt(total)}</b> mentions</p>
            <div className="flex w-full items-center gap-3 sm:w-72">
              <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${pct(mix.positive, total)}% positive, ${pct(mix.negative, total)}% negative`}>
                {(["positive", "neutral", "negative"] as const).map((k) => <div key={k} style={{ width: `${pct(mix[k], total)}%`, background: STRIPE[k] }} />)}
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted">{pct(mix.positive, total)}% / {pct(mix.negative, total)}%</span>
            </div>
          </div>

          <div className="snap-row -mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="group" aria-label="Show only">
            {SENTIMENTS.map(([k, label]) => (
              <button key={k} onClick={() => { setFilters({ sentiment: k }); setPage(0); }} aria-pressed={filters.sentiment === k}
                className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm transition ${filters.sentiment === k ? "border-brand bg-brand-soft font-semibold text-brand" : "border-line bg-white text-slate-600 hover:bg-slate-50"}`}>
                {k !== "all" && <i className="size-2 rounded-full" style={{ background: STRIPE[k] }} />}{label}<span className="tabular-nums text-xs opacity-70">{fmt(counts[k])}</span>
              </button>))}
            {filters.q.trim() && (
              <button onClick={() => setFilters({ q: "" })} aria-label={`Clear search ${filters.q}`} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-3 text-sm text-amber-800 hover:bg-amber-100">Search: {filters.q}<X size={14} /></button>)}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex w-full shrink-0 rounded-lg border border-line bg-slate-50 p-0.5 text-sm sm:inline-flex sm:w-auto" role="tablist" aria-label="View">
              {([["reviews", "Reviews"], ["issues", "By issue"]] as const).map(([v, label]) => (
                <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`min-h-9 flex-1 rounded-md px-3 font-medium transition sm:flex-none ${view === v ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}>{label}</button>))}
            </div>
            <select aria-label="Sort reviews" value={sort} onChange={(e) => { setSort(e.target.value as Sort); setPage(0); }} className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white pl-2 text-sm text-ink sm:max-w-48 sm:flex-none"><option value="count">Most mentioned</option><option value="negative">Negative first</option><option value="text">A to Z</option></select>
            <button onClick={exportRows} disabled={!rows.length} aria-label={`Export ${fmt(rows.length)} reviews`} title="Export these reviews as CSV" className={`${btn} ml-auto h-10 shrink-0 !px-3`}><Download size={16} /><span className="hidden sm:inline">Export {fmt(rows.length)}</span></button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-14 text-center"><p className="font-medium">No feedback matches these filters.</p><p className="mt-1 text-sm text-muted">Clear a filter or try another search.</p>
            <button onClick={resetFilters} className={`${btn} mt-4`}>Clear all filters</button></div>
        ) : view === "issues" ? (
          <ul className="divide-y divide-slate-100">
            {groups.map((g) => {
              const issue = issueById(g.id);
              return (
                <li key={g.id}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 marker:hidden hover:bg-slate-50 md:px-5">
                      <span className="min-w-0 flex-1"><span className="block font-medium">{issue.name}</span><span className="block text-xs text-muted">{issue.category} · {g.items.length} distinct {g.items.length === 1 ? "review" : "reviews"}</span></span>
                      <span className="text-right text-sm tabular-nums"><span className="block font-semibold">{fmt(g.mentions)}</span><span className="block text-xs text-muted">{pct(g.neg, g.mentions)}% negative</span></span>
                    </summary>
                    <ul className="space-y-2 bg-slate-50 px-4 py-3 md:px-5">
                      {g.items.slice(0, 8).map(({ r, w }) => <li key={r.id} className="flex gap-3 rounded-lg border-l-4 bg-white px-3 py-2 text-sm" style={{ borderLeftColor: STRIPE[r.sentiment] }}><span className="flex-1"><Hl text={r.text} q={filters.q} /></span><span className="shrink-0 tabular-nums text-muted">{fmt(w)}×</span></li>)}
                      {g.items.length > 8 && <li className="px-1 text-xs text-muted">and {g.items.length - 8} more, in the Reviews view.</li>}
                    </ul>
                  </details>
                </li>);
            })}
          </ul>
        ) : (
          <>
            {/* Phones: one card per review */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {slice.map(({ r, w }) => {
                const issue = issueById(r.issue);
                return (
                  <li key={r.id} className="border-l-4 px-4 py-4" style={{ borderLeftColor: STRIPE[r.sentiment] }}>
                    <p className="text-[15px] leading-relaxed"><Hl text={r.text} q={filters.q} /></p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2"><SentimentPill s={r.sentiment} /><Chip>{r.category}</Chip>{r.source === "user" && <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">Added by you</span>}</div>
                    <p className="mt-2 text-xs text-slate-500">{issue.name}</p>
                    <div className="mt-2.5 flex items-center gap-3"><div className="h-1.5 flex-1 rounded-full bg-slate-100"><div className="h-1.5 rounded-full" style={{ width: `${Math.max(4, (w / maxW) * 100)}%`, background: STRIPE[r.sentiment] }} /></div><span className="text-sm font-medium tabular-nums">{fmt(w)}×</span>
                      {canTrack(r) && <button onClick={() => track(r.issue)} disabled={isTracked(r.issue)} className="min-h-9 rounded-lg border border-line px-3 text-xs font-semibold text-brand disabled:text-muted">{isTracked(r.issue) ? "Tracked" : "Track"}</button>}</div>
                  </li>);
              })}
            </ul>
            {/* Larger screens: table */}
            <div className="hidden overflow-x-auto md:block"><table className="w-full text-sm">
              <thead className="text-left text-xs text-muted"><tr><th className="px-5 py-2.5 font-medium">Review</th><th className="px-3 font-medium">Issue</th><th className="px-3 font-medium">Sentiment</th><th className="w-44 px-3 font-medium">Mentions</th><th /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {slice.map(({ r, w }) => {
                  const issue = issueById(r.issue);
                  return (
                    <tr key={r.id} className="align-top">
                      <td className="max-w-md py-3.5 pl-5 pr-3" style={{ boxShadow: `inset 3px 0 0 ${STRIPE[r.sentiment]}` }}>
                        <p className="leading-relaxed"><Hl text={r.text} q={filters.q} /></p>
                        <p className="mt-1.5 flex items-center gap-2"><Chip>{r.category}</Chip>{r.source === "user" && <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">Added by you</span>}</p>
                      </td>
                      <td className="px-3 py-3.5 text-slate-600">{issue.name}</td>
                      <td className="px-3 py-3.5"><SentimentPill s={r.sentiment} /></td>
                      <td className="px-3 py-3.5"><div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-slate-100"><div className="h-1.5 rounded-full" style={{ width: `${Math.max(4, (w / maxW) * 100)}%`, background: STRIPE[r.sentiment] }} /></div><span className="w-10 text-right tabular-nums">{fmt(w)}</span></div></td>
                      <td className="px-3 py-3.5 text-right">{canTrack(r) && <button onClick={() => track(r.issue)} disabled={isTracked(r.issue)} className="text-xs font-semibold text-brand disabled:text-muted">{isTracked(r.issue) ? "Tracked" : "Track"}</button>}</td>
                    </tr>);
                })}
              </tbody></table></div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 px-4 py-3 text-sm md:px-5">
              <span className="text-muted">Showing {p * PAGE + 1} to {Math.min((p + 1) * PAGE, rows.length)} of {fmt(rows.length)}</span>
              <div className="flex gap-2"><button className={`${btn} min-h-10`} disabled={p === 0} onClick={() => setPage(p - 1)}>Previous</button><button className={`${btn} min-h-10`} disabled={p >= pages - 1} onClick={() => setPage(p + 1)}>Next</button></div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
