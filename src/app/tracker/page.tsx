"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { issueById, rankIssues, DEFAULT_FILTERS } from "@/lib/data";
import { useApp, type TrackedStatus } from "@/lib/store";
import { Card, PageHead, ScoreBadge, Chip, btnPrimary } from "@/components/ui";

const STATUSES: TrackedStatus[] = ["New", "Investigating", "In progress", "Resolved"];

export default function Tracker() {
  const { tracked, updateTracked, untrack, ready, filters } = useApp();
  // `filters` changes identity when feedback is added, which must refresh this.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const score = useMemo(() => Object.fromEntries(rankIssues(DEFAULT_FILTERS).map((i) => [i.id, i.score])), [filters]);
  return (
    <>
      <PageHead title="Tracker" sub="Issues you decided to act on. Status, owner and notes are saved in this browser." />
      {ready && tracked.length === 0 ? (
        <Card className="py-14 text-center">
          <p className="font-medium">Nothing tracked yet</p>
          <p className="mt-1 text-sm text-muted">Open Priorities and choose “Track this issue” on the problems you want to own.</p>
          <Link href="/priorities" className={`${btnPrimary} mt-5`}>Go to Priorities</Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STATUSES.map((s) => (
            <div key={s} className="rounded-xl bg-slate-100/70 p-3">
              <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-semibold">{s}<span className="rounded-full bg-white px-2 text-xs text-muted">{tracked.filter((t) => t.status === s).length}</span></h2>
              <div className="space-y-3">
                {tracked.filter((t) => t.status === s).map((t) => {
                  const i = issueById(t.issueId);
                  return (
                    <Card key={t.issueId} className="!p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2"><p className="text-sm font-medium leading-snug">{i.name}</p>
                        <button aria-label={`Stop tracking ${i.name}`} onClick={() => untrack(t.issueId)} className="text-muted hover:text-neg"><Trash2 size={14} /></button></div>
                      <div className="flex flex-wrap gap-1.5"><Chip>{i.category}</Chip>{score[t.issueId] != null && <ScoreBadge score={score[t.issueId]} />}</div>
                      <select aria-label="Status" value={t.status} onChange={(e) => updateTracked(t.issueId, { status: e.target.value as TrackedStatus })} className="w-full rounded-lg border border-line px-2 py-1.5 text-sm">{STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
                      <input aria-label="Owner" placeholder="Owner" value={t.owner} onChange={(e) => updateTracked(t.issueId, { owner: e.target.value })} className="w-full rounded-lg border border-line px-2 py-1.5 text-sm" />
                      <textarea aria-label="Notes" placeholder="Notes" value={t.note} onChange={(e) => updateTracked(t.issueId, { note: e.target.value })} rows={2} className="w-full rounded-lg border border-line px-2 py-1.5 text-sm" />
                    </Card>);
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
