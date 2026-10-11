"use client";
import { Filter } from "lucide-react";
import { CATEGORIES, WEEKS } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Card } from "./ui";

const sel = "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";
export function FilterBar() {
  const { filters: f, setFilters, resetFilters } = useApp();
  const dirty = f.category !== "all" || f.sentiment !== "all" || f.from !== 0 || f.to !== WEEKS - 1 || f.q;
  return (
    <Card className="no-print mb-6 flex flex-wrap items-center gap-3 !py-3">
      <Filter size={16} className="text-muted" />
      <select aria-label="Category" className={sel} value={f.category} onChange={(e) => setFilters({ category: e.target.value })}>
        <option value="all">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}
      </select>
      <select aria-label="Sentiment" className={sel} value={f.sentiment} onChange={(e) => setFilters({ sentiment: e.target.value })}>
        <option value="all">All sentiment</option><option value="positive">Positive</option><option value="neutral">Neutral</option><option value="negative">Negative</option>
      </select>
      <select aria-label="Period" className={sel} value={`${f.from}-${f.to}`} onChange={(e) => { const [a, b] = e.target.value.split("-").map(Number); setFilters({ from: a, to: b }); }}>
        <option value={`0-${WEEKS - 1}`}>All 13 weeks</option>
        <option value={`${WEEKS - 4}-${WEEKS - 1}`}>Last 4 weeks</option>
        <option value={`${WEEKS - 8}-${WEEKS - 1}`}>Last 8 weeks</option>
        <option value={`0-${Math.floor(WEEKS / 2) - 1}`}>First half</option>
      </select>
      {dirty && <button onClick={resetFilters} className="ml-auto text-sm font-medium text-brand hover:underline">Clear filters</button>}
    </Card>
  );
}
