"use client";
import { useMemo, useState } from "react";
import { Plus, ListPlus, Check } from "lucide-react";
import { filterReviews, issueById, fmt } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Card, PageHead, SentimentPill, Chip, btn, btnPrimary } from "@/components/ui";
import { FilterBar } from "@/components/filters";

const PAGE = 15;
export default function Feedback() {
  const { filters, tracked, track } = useApp();
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<"count" | "text">("count");
  const rows = useMemo(() => filterReviews(filters).sort((a, b) => (sort === "count" ? b.w - a.w : a.r.text.localeCompare(b.r.text))), [filters, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const p = Math.min(page, pages - 1);
  return (
    <>
      <PageHead title="Feedback" sub="Every distinct review with how many times customers said it, the issue it belongs to, and its sentiment." />
      <FilterBar />
      <Card className="!p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3 text-sm">
          <span className="text-muted">{fmt(rows.length)} distinct reviews · {fmt(rows.reduce((a, x) => a + x.w, 0))} total mentions</span>
          <label className="flex items-center gap-2 text-muted">Sort
            <select value={sort} onChange={(e) => setSort(e.target.value as "count" | "text")} className="rounded-lg border border-line px-2 py-1 text-ink"><option value="count">Most mentioned</option><option value="text">A to Z</option></select></label>
        </div>
        {rows.length === 0 ? <p className="py-12 text-center text-muted">No feedback matches these filters.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted"><tr><th className="px-5 py-2">Review</th><th className="px-3">Category</th><th className="px-3">Issue</th><th className="px-3">Sentiment</th><th className="px-3 text-right">Mentions</th><th /></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.slice(p * PAGE, p * PAGE + PAGE).map(({ r, w }) => {
                const issue = issueById(r.issue);
                const tr = tracked.some((t) => t.issueId === r.issue);
                return (
                  <tr key={r.id} className="align-top">
                    <td className="max-w-md px-5 py-3">{r.text}</td><td className="px-3 py-3"><Chip>{r.category}</Chip></td>
                    <td className="px-3 py-3 text-slate-600">{issue.name}</td><td className="px-3 py-3"><SentimentPill s={r.sentiment} /></td>
                    <td className="px-3 py-3 text-right tabular-nums">{fmt(w)}</td>
                    <td className="px-3 py-3">{issue.polarity === "negative" && r.sentiment === "negative" && (
                      <button onClick={() => track(r.issue)} disabled={tr} className="text-xs font-medium text-brand disabled:text-muted">{tr ? "Tracked" : "Track"}</button>)}</td>
                  </tr>);
              })}
            </tbody></table></div>
        )}
        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm">
          <span className="text-muted">Page {p + 1} of {pages}</span>
          <div className="flex gap-2"><button className={btn} disabled={p === 0} onClick={() => setPage(p - 1)}>Previous</button><button className={btn} disabled={p >= pages - 1} onClick={() => setPage(p + 1)}>Next</button></div>
        </div>
      </Card>
    </>
  );
}
