"use client";
import { useEffect, useRef, useState } from "react";
import { Filter, SlidersHorizontal, X } from "lucide-react";
import { categories, WEEKS } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Card } from "./ui";

const sel = "shrink-0 rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand";
const PERIODS = [
  { v: `0-${WEEKS - 1}`, label: "All 13 weeks" },
  { v: `${WEEKS - 4}-${WEEKS - 1}`, label: "Last 4 weeks" },
  { v: `${WEEKS - 8}-${WEEKS - 1}`, label: "Last 8 weeks" },
  { v: `0-${Math.floor(WEEKS / 2) - 1}`, label: "First half" },
];
const SENTIMENT_LABEL: Record<string, string> = { positive: "Positive", neutral: "Mixed", negative: "Negative" };

export function FilterBar() {
  const { filters: f, setFilters, resetFilters } = useApp();
  const [sheet, setSheet] = useState(false);
  const dlg = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = dlg.current; if (!d) return; if (sheet && !d.open) d.showModal(); if (!sheet && d.open) d.close(); }, [sheet]);

  const period = `${f.from}-${f.to}`;
  const chips = [
    f.category !== "all" && { label: f.category, clear: () => setFilters({ category: "all" }) },
    f.sentiment !== "all" && { label: SENTIMENT_LABEL[f.sentiment] ?? f.sentiment, clear: () => setFilters({ sentiment: "all" }) },
    period !== PERIODS[0].v && { label: PERIODS.find((p) => p.v === period)?.label ?? "Custom period", clear: () => setFilters({ from: 0, to: WEEKS - 1 }) },
  ].filter(Boolean) as { label: string; clear: () => void }[];
  const dirty = chips.length > 0 || !!f.q;

  return (
    <>
      {/* Larger screens: all three filters in a row */}
      <Card className="no-print mb-6 hidden items-center gap-3 !py-3 sm:flex sm:flex-wrap">
        <Filter size={16} className="shrink-0 text-muted" />
        <select aria-label="Category" className={sel} value={f.category} onChange={(e) => setFilters({ category: e.target.value })}>
          <option value="all">All categories</option>{categories().map((c) => <option key={c}>{c}</option>)}
        </select>
        <select aria-label="Sentiment" className={sel} value={f.sentiment} onChange={(e) => setFilters({ sentiment: e.target.value })}>
          <option value="all">All sentiment</option><option value="positive">Positive</option><option value="neutral">Neutral</option><option value="negative">Negative</option>
        </select>
        <select aria-label="Period" className={sel} value={period} onChange={(e) => { const [a, b] = e.target.value.split("-").map(Number); setFilters({ from: a, to: b }); }}>
          {PERIODS.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
        </select>
        {dirty && <button onClick={resetFilters} className="ml-auto shrink-0 whitespace-nowrap text-sm font-medium text-brand hover:underline">Clear filters</button>}
      </Card>

      {/* Phones: one button, active filters as removable chips, options in a bottom sheet */}
      <div className="no-print mb-4 flex items-center gap-2 sm:hidden">
        <button onClick={() => setSheet(true)} aria-haspopup="dialog" className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold">
          <SlidersHorizontal size={16} className="text-brand" />Filters
          {chips.length > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand text-[11px] text-white">{chips.length}</span>}
        </button>
        <div className="snap-row flex min-w-0 flex-1 gap-2 overflow-x-auto">
          {chips.map((c) => (
            <button key={c.label} onClick={c.clear} aria-label={`Remove filter ${c.label}`} className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-brand-soft px-3 text-sm font-medium text-brand">{c.label}<X size={14} /></button>))}
        </div>
      </div>
      <dialog ref={dlg} onClose={() => setSheet(false)} onClick={(e) => e.target === dlg.current && setSheet(false)} aria-label="Filters"
        className="m-auto mb-0 w-full max-w-none rounded-t-3xl border-0 bg-white p-0 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm sm:hidden">
        {sheet && (
          <div className="px-5 pb-6 pt-3">
            <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-slate-300" />
            <div className="mt-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Filters</h2><button onClick={() => setSheet(false)} aria-label="Close filters" className="grid size-10 place-items-center rounded-full text-muted hover:bg-slate-100"><X size={18} /></button></div>
            <div className="mt-3 space-y-4">
              <label className="block text-sm font-medium">Category
                <select className="mt-1.5 h-12 w-full rounded-xl border border-line bg-white px-3 text-base font-normal" value={f.category} onChange={(e) => setFilters({ category: e.target.value })}>
                  <option value="all">All categories</option>{categories().map((c) => <option key={c}>{c}</option>)}</select></label>
              <label className="block text-sm font-medium">Sentiment
                <select className="mt-1.5 h-12 w-full rounded-xl border border-line bg-white px-3 text-base font-normal" value={f.sentiment} onChange={(e) => setFilters({ sentiment: e.target.value })}>
                  <option value="all">All sentiment</option><option value="positive">Positive</option><option value="neutral">Mixed</option><option value="negative">Negative</option></select></label>
              <label className="block text-sm font-medium">Period
                <select className="mt-1.5 h-12 w-full rounded-xl border border-line bg-white px-3 text-base font-normal" value={period} onChange={(e) => { const [a, b] = e.target.value.split("-").map(Number); setFilters({ from: a, to: b }); }}>
                  {PERIODS.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}</select></label>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={resetFilters} disabled={!dirty} className="h-12 flex-1 rounded-xl border border-line text-sm font-semibold disabled:text-slate-400">Clear</button>
              <button onClick={() => setSheet(false)} className="h-12 flex-[2] rounded-xl bg-brand text-sm font-semibold text-white">Show results</button>
            </div>
          </div>)}
      </dialog>
    </>
  );
}
