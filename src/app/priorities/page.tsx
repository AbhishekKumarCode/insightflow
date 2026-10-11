"use client";
import { useMemo, useState } from "react";
import { ChevronDown, Check, Plus } from "lucide-react";
import { rankIssues, fmt } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Card, PageHead, ScoreBadge, Chip, btn, btnPrimary } from "@/components/ui";
import { FilterBar } from "@/components/filters";

export default function Priorities() {
  const { filters, tracked, track } = useApp();
  const ranked = useMemo(() => rankIssues(filters), [filters]);
  const [open, setOpen] = useState<string | null>(null);
  const openId = open ?? ranked[0]?.id;
  return (
    <>
      <PageHead title="Priorities" sub="Issues ranked by how many customers hit them, how consistently negative they are, and how severe they are." />
      <FilterBar />
      <p className="mb-4 text-xs text-muted">Score = 100 × (0.40 × volume + 0.35 × negative share + 0.25 × severity). This is a heuristic to rank, not a measurement. Volume uses original review counts, not de-duplicated rows. Issues with fewer than 5 negative reviews are not ranked.</p>
      {ranked.length === 0 && <Card className="py-12 text-center text-muted">No negative feedback matches these filters.</Card>}
      <div className="space-y-3">
        {ranked.map((i, n) => {
          const isOpen = openId === i.id;
          const isTracked = tracked.some((t) => t.issueId === i.id);
          const { volume, negativeShare, severity } = i.inputs;
          return (
            <Card key={i.id} className="!p-0 overflow-hidden">
              <button onClick={() => setOpen(isOpen ? "" : i.id)} aria-expanded={isOpen} className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left">
                <span className="grid size-7 place-items-center rounded-full bg-slate-100 text-xs font-semibold">{n + 1}</span>
                <span className="font-semibold">{i.name}</span><ScoreBadge score={i.score} /><Chip>{i.category}</Chip>
                <span className="ml-auto text-sm text-muted">{fmt(i.negative)} negative reviews</span>
                <ChevronDown size={16} className={`text-muted transition ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="grid gap-6 border-t border-line bg-slate-50/50 px-5 py-5 md:grid-cols-2">
                  <div className="space-y-5">
                    <div><h3 className="text-sm font-semibold">Why this deserves attention</h3><p className="mt-1 text-sm text-slate-700">{i.recommendation?.why}</p></div>
                    <div>
                      <h3 className="text-sm font-semibold">Recommended actions</h3>
                      <ul className="mt-1 space-y-1.5 text-sm text-slate-700">{i.recommendation?.actions.map((a) => <li key={a} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-brand" />{a}</li>)}</ul>
                    </div>
                    <button disabled={isTracked} onClick={() => track(i.id)} className={isTracked ? btn : btnPrimary}>
                      {isTracked ? <><Check size={16} />Tracked</> : <><Plus size={16} />Track this issue</>}
                    </button>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-sm font-semibold">How the score is built</h3>
                      <table className="mt-1 w-full text-sm"><tbody className="divide-y divide-line">
                        <Row k="Volume" w="× 0.40" v={volume} note={`${fmt(i.negative)} negative reviews vs the largest issue`} />
                        <Row k="Negative share" w="× 0.35" v={negativeShare} note={`${fmt(i.negative)} of ${fmt(i.rows)} reviews on this issue`} />
                        <Row k="Severity" w="× 0.25" v={severity} note="Hand-assigned: money loss and fraud rank highest" />
                        <tr className="font-semibold"><td className="py-2">Score</td><td /><td className="py-2 text-right">{i.score}</td><td /></tr>
                      </tbody></table>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">What customers wrote</h3>
                      <ul className="mt-1 space-y-2">{i.quotes.map((q) => <li key={q.id} className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-slate-700">“{q.text}” <span className="text-xs text-muted">reported {fmt(q.count)}×</span></li>)}</ul>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
function Row({ k, w, v, note }: { k: string; w: string; v: number; note: string }) {
  return <tr><td className="py-2 pr-2">{k}<div className="text-xs text-muted">{note}</div></td><td className="px-2 text-muted">{w}</td><td className="px-2 text-right tabular-nums">{v.toFixed(2)}</td><td /></tr>;
}
