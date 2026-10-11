"use client";
import { useMemo, useState } from "react";
import { filterReviews, issueById, fmt, pct } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Card, PageHead, SentimentPill, Chip, btn } from "@/components/ui";
import { FilterBar } from "@/components/filters";

const PAGE = 15;
const STRIPE = { positive: "#2f8f5b", neutral: "#c98a1b", negative: "#c8372d" };

export default function Feedback() {
  const { filters, tracked, track } = useApp();
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<"count" | "text">("count");
  const rows = useMemo(() => filterReviews(filters).sort((a, b) => (sort === "count" ? b.w - a.w : a.r.text.localeCompare(b.r.text))), [filters, sort]);
  const total = rows.reduce((a, x) => a + x.w, 0);
  const maxW = Math.max(1, ...rows.map((x) => x.w));
  const mix = { positive: 0, neutral: 0, negative: 0 };
  rows.forEach(({ r, w }) => (mix[r.sentiment] += w));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const p = Math.min(page, pages - 1);

  return (
    <>
      <PageHead title="Feedback" sub="Every distinct review, with how many customers said it. The bar is how often it was repeated." />
      <FilterBar />
      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-slate-200/70 px-5 py-4">
          <div><p className="text-2xl font-semibold tabular-nums leading-none">{fmt(rows.length)}</p><p className="mt-1 text-xs text-muted">distinct reviews</p></div>
          <div><p className="text-2xl font-semibold tabular-nums leading-none">{fmt(total)}</p><p className="mt-1 text-xs text-muted">total mentions</p></div>
          <div className="min-w-48 flex-1 md:max-w-xs">
            <div className="flex h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${pct(mix.positive, total)}% positive, ${pct(mix.negative, total)}% negative`}>
              {(["positive", "neutral", "negative"] as const).map((k) => <div key={k} className="grow" style={{ width: `${pct(mix[k], total)}%`, background: STRIPE[k] }} />)}
            </div>
            <p className="mt-1.5 text-xs text-muted">{pct(mix.positive, total)}% positive, {pct(mix.negative, total)}% negative</p>
          </div>
          <label className="ml-auto flex items-center gap-2 text-sm text-muted">Sort
            <select value={sort} onChange={(e) => setSort(e.target.value as "count" | "text")} className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-ink"><option value="count">Most mentioned</option><option value="text">A to Z</option></select></label>
        </div>

        {rows.length === 0 ? <p className="py-14 text-center text-muted">No feedback matches these filters. Clear a filter or try another search.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-left text-xs text-muted"><tr><th className="px-5 py-2.5 font-medium">Review</th><th className="px-3 font-medium">Issue</th><th className="px-3 font-medium">Sentiment</th><th className="w-44 px-3 font-medium">Mentions</th><th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.slice(p * PAGE, p * PAGE + PAGE).map(({ r, w }) => {
                const issue = issueById(r.issue);
                const tr = tracked.some((t) => t.issueId === r.issue);
                return (
                  <tr key={r.id} className="align-top">
                    <td className="max-w-md py-3.5 pl-5 pr-3" style={{ boxShadow: `inset 3px 0 0 ${STRIPE[r.sentiment]}` }}>
                      <p className="leading-relaxed">{r.text}</p>
                      <p className="mt-1.5 flex items-center gap-2"><Chip>{r.category}</Chip>{r.source === "user" && <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">Added by you</span>}</p>
                    </td>
                    <td className="px-3 py-3.5 text-slate-600">{issue.name}</td>
                    <td className="px-3 py-3.5"><SentimentPill s={r.sentiment} /></td>
                    <td className="px-3 py-3.5"><div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-slate-100"><div className="grow h-1.5 rounded-full" style={{ width: `${Math.max(4, (w / maxW) * 100)}%`, background: STRIPE[r.sentiment] }} /></div><span className="w-10 text-right tabular-nums">{fmt(w)}</span></div></td>
                    <td className="px-3 py-3.5 text-right">{issue.polarity === "negative" && r.sentiment === "negative" && (
                      <button onClick={() => track(r.issue)} disabled={tr} className="text-xs font-semibold text-brand disabled:text-muted">{tr ? "Tracked" : "Track"}</button>)}</td>
                  </tr>);
              })}
            </tbody></table></div>
        )}
        <div className="flex items-center justify-between border-t border-slate-200/70 px-5 py-3 text-sm">
          <span className="text-muted">Page {p + 1} of {pages}</span>
          <div className="flex gap-2"><button className={btn} disabled={p === 0} onClick={() => setPage(p - 1)}>Previous</button><button className={btn} disabled={p >= pages - 1} onClick={() => setPage(p + 1)}>Next</button></div>
        </div>
      </Card>
    </>
  );
}
