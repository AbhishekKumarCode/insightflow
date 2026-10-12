"use client";
import { useMemo, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { rankIssues, fmt } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Card, PageHead, Chip, ScoreRing, btn, btnPrimary } from "@/components/ui";
import { FilterBar } from "@/components/filters";

export default function Priorities() {
  const { filters, tracked, track } = useApp();
  const ranked = useMemo(() => rankIssues(filters), [filters]);
  const [pick, setPick] = useState<string | null>(null);
  const detail = useRef<HTMLElement>(null);
  const sel = ranked.find((i) => i.id === pick) ?? ranked[0];
  const isTracked = sel ? tracked.some((t) => t.issueId === sel.id) : false;
  const parts = sel ? [
    { k: "Reach", pts: 40 * sel.inputs.volume, color: "#4f46e5", note: `${fmt(sel.negative)} negative reviews, ${Math.round(sel.inputs.volume * 100)}% of the most-reported issue` },
    { k: "Consistency", pts: 35 * sel.inputs.negativeShare, color: "#818cf8", note: `${fmt(sel.negative)} of ${fmt(sel.rows)} reviews on this issue are negative` },
    { k: "Severity", pts: 25 * sel.inputs.severity, color: "#fb7185", note: "Set by hand. Money loss and fraud rank highest, inconvenience lowest" },
  ] : [];
  const maxQuote = sel ? Math.max(...sel.quotes.map((q) => q.count)) : 1;

  return (
    <>
      <PageHead title="Priorities" sub="Each issue is a case: how many people hit it, how one-sided it is, and how much it costs when it happens." />
      <FilterBar />
      {ranked.length === 0 && <Card className="py-12 text-center text-muted">No negative feedback matches these filters.</Card>}
      {sel && (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <ol className="snap-row -mx-4 flex min-w-0 snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2 lg:mx-0 lg:block lg:space-y-2 lg:overflow-visible lg:px-0 lg:pb-0" aria-label="Ranked issues">
            {ranked.map((i, n) => (
              <li key={i.id} className="w-[16.5rem] shrink-0 snap-start lg:w-auto">
                <button onClick={() => { setPick(i.id); if (typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches) requestAnimationFrame(() => detail.current?.scrollIntoView({ behavior: "smooth", block: "start" })); }} aria-current={sel.id === i.id} className={`relative flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${sel.id === i.id ? "border-indigo-300 bg-white shadow-sm" : "border-transparent hover:bg-white/70"}`}>
                  {sel.id === i.id && <span className="absolute -left-px top-3 h-[calc(100%-1.5rem)] w-1 rounded-r-full bg-indigo-500" />}
                  <ScoreRing score={i.score} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{i.name}</span>
                    <span className="block text-xs text-muted">{n + 1}. {i.category}, {fmt(i.negative)} negative</span></span>
                  {tracked.some((t) => t.issueId === i.id) && <Check size={16} className="shrink-0 text-indigo-600" aria-label="Tracked" />}
                </button>
              </li>
            ))}
          </ol>

          <article ref={detail} key={sel.id} className="scroll-mt-20 tab-pane min-w-0 space-y-7 self-start rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(15,18,38,0.04)] md:p-8 lg:sticky lg:top-24">
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div><Chip>{sel.category}</Chip><h2 className="mt-2 text-[28px] font-semibold leading-tight">{sel.name}</h2></div>
              <button disabled={isTracked} onClick={() => track(sel.id)} className={isTracked ? btn : btnPrimary}>
                {isTracked ? <><Check size={16} />Tracked</> : <><Plus size={16} />Track this issue</>}</button>
            </header>

            <section aria-label="Score anatomy">
              <div className="flex items-end justify-between"><h3 className="text-sm font-semibold">How the score adds up</h3>
                <p className="font-display text-4xl font-semibold leading-none tabular-nums">{sel.score}<span className="text-lg text-muted"> / 100</span></p></div>
              <div className="mt-3 flex h-4 overflow-hidden rounded-full bg-slate-100">
                {parts.map((p) => <div key={p.k} className="grow h-full" style={{ width: `${p.pts}%`, background: p.color }} title={`${p.k}: ${p.pts.toFixed(1)} points`} />)}
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                {parts.map((p) => (
                  <div key={p.k}><dt className="flex items-center gap-2 text-sm font-medium"><i className="size-2.5 rounded-sm" style={{ background: p.color }} />{p.k}<span className="ml-auto tabular-nums">{p.pts.toFixed(1)}</span></dt>
                    <dd className="mt-1 text-xs leading-relaxed text-muted">{p.note}</dd></div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-muted">A ranking heuristic: 40% reach, 35% consistency, 25% severity. Repeated reviews count at their original numbers.</p>
            </section>

            <section><h3 className="text-sm font-semibold">Why it deserves attention</h3><p className="mt-1.5 max-w-prose text-[15px] leading-relaxed text-slate-700">{sel.recommendation?.why}</p></section>

            <section><h3 className="text-sm font-semibold">What to do</h3>
              <ul className="mt-2 space-y-2">{sel.recommendation?.actions.map((a) => (
                <li key={a} className="flex gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed"><Check size={16} className="mt-0.5 shrink-0 text-indigo-600" />{a}</li>))}</ul></section>

            <section><h3 className="text-sm font-semibold">What customers wrote</h3>
              <ul className="mt-2 space-y-2.5">{sel.quotes.map((q) => (
                <li key={q.id} className="relative overflow-hidden rounded-xl border border-slate-200 px-4 py-3 text-sm">
                  <span className="absolute inset-y-0 left-0 bg-rose-50" style={{ width: `${(q.count / maxQuote) * 100}%` }} />
                  <span className="relative flex gap-3"><span className="flex-1 leading-relaxed">“{q.text}”</span><span className="shrink-0 font-medium tabular-nums text-rose-700">{fmt(q.count)}×</span></span>
                </li>))}</ul></section>
          </article>
        </div>
      )}
    </>
  );
}
