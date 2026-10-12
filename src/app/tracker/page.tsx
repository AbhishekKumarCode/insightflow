"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { issueById, rankIssues, DEFAULT_FILTERS, pct } from "@/lib/data";
import { useApp, type TrackedStatus } from "@/lib/store";
import { Card, PageHead, Chip, ScoreRing, btnPrimary } from "@/components/ui";

const STATUSES: { s: TrackedStatus; color: string; hint: string }[] = [
  { s: "New", color: "#94a3b8", hint: "Not looked at yet" },
  { s: "Investigating", color: "#f59e0b", hint: "Finding the cause" },
  { s: "In progress", color: "#6366f1", hint: "A fix is underway" },
  { s: "Resolved", color: "#10b981", hint: "Fixed and confirmed" },
];
const days = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

export default function Tracker() {
  const { tracked, updateTracked, untrack, ready, filters } = useApp();
  // `filters` changes identity when feedback is added, which must refresh this.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const score = useMemo(() => Object.fromEntries(rankIssues(DEFAULT_FILTERS).map((i) => [i.id, i.score])), [filters]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<TrackedStatus | null>(null);
  const [landed, setLanded] = useState<string | null>(null);
  const draggedStatus = dragging ? tracked.find((t) => t.issueId === dragging)?.status : undefined;
  const drop = (s: TrackedStatus, id: string) => {
    if (id) { updateTracked(id, { status: s }); setLanded(id); setTimeout(() => setLanded(null), 700); }
    setDragging(null); setOver(null);
  };
  // The browser drags a snapshot of the card. Hand it a lifted copy (tilted, big shadow) so it looks like it is in the air.
  const lift = (e: React.DragEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const ghost = el.cloneNode(true) as HTMLElement;
    Object.assign(ghost.style, { position: "fixed", top: "-9999px", left: "-9999px", width: `${el.offsetWidth}px`, background: "#fff", borderColor: "#6366f1", transform: "rotate(3deg) scale(1.03)", boxShadow: "0 28px 44px -14px rgba(15,18,38,0.45)", opacity: "0.98", pointerEvents: "none" });
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 36, 28);
    setTimeout(() => ghost.remove(), 0);
  };
  const count = (s: TrackedStatus) => tracked.filter((t) => t.status === s).length;

  return (
    <>
      <PageHead title="Tracker" sub="Drag a card to the column that matches where the work is. Everything is saved in this browser." />
      {ready && tracked.length === 0 ? (
        <Card className="mx-auto max-w-xl py-14 text-center">
          <ScoreRing score={0} size={56} />
          <p className="font-display mt-4 text-xl font-semibold">Nothing tracked yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Pick the problems you want to own. Each one becomes a card you can move from New to Resolved.</p>
          <Link href="/priorities" className={`${btnPrimary} mt-6`}>Choose issues in Priorities</Link>
        </Card>
      ) : (
        <>
          <Card className="mb-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><p className="font-display text-3xl font-semibold leading-none tabular-nums">{pct(count("Resolved"), tracked.length)}%</p><p className="mt-1 text-sm text-muted">resolved, {count("Resolved")} of {tracked.length} tracked</p></div>
              <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">{STATUSES.map(({ s, color }) => <li key={s} className="flex items-center gap-2"><i className="size-2.5 rounded-full" style={{ background: color }} />{s}<b className="tabular-nums">{count(s)}</b></li>)}</ul>
            </div>
            <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Pipeline progress">
              {STATUSES.map(({ s, color }) => <div key={s} className="h-full transition-all duration-500" style={{ width: `${pct(count(s), tracked.length)}%`, background: color }} />)}
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {STATUSES.map(({ s, color, hint }) => (
              <section key={s} aria-label={s}
                onDragOver={(e) => { if (e.dataTransfer.types.includes("text/plain")) { e.preventDefault(); setOver(s); } }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }}
                onDrop={(e) => { e.preventDefault(); drop(s, e.dataTransfer.getData("text/plain")); }}
                className={`rounded-2xl p-3 transition-colors ${over === s ? "bg-indigo-100/70 ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#f3f5fa]" : "bg-slate-200/40"}`}>
                <header className="mb-3 px-1"><h2 className="flex items-center gap-2 text-sm font-semibold"><i className="size-2.5 rounded-full" style={{ background: color }} />{s}<span className="ml-auto rounded-full bg-white px-2 text-xs text-muted">{count(s)}</span></h2><p className="mt-0.5 text-xs text-muted">{hint}</p></header>
                <div className="space-y-3">
                  {tracked.filter((t) => t.status === s).map((t) => {
                    const i = issueById(t.issueId);
                    return (
                      <article key={t.issueId} draggable data-issue={t.issueId}
                        onDragStart={(e) => { setDragging(t.issueId); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", t.issueId); lift(e); }}
                        onDragEnd={() => { setDragging(null); setOver(null); }}
                        className={`cursor-grab space-y-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,18,38,0.04)] transition active:cursor-grabbing ${dragging === t.issueId ? "border-dashed border-indigo-300 bg-indigo-50/50 opacity-50" : "hover:shadow-md"} ${landed === t.issueId ? "landed" : ""}`}>
                        <div className="flex items-start gap-3">
                          <GripVertical size={14} aria-hidden className="mt-1 shrink-0 text-slate-300" />
                          {score[t.issueId] != null && <ScoreRing score={score[t.issueId]} size={40} />}
                          <div className="min-w-0 flex-1"><p className="text-sm font-semibold leading-snug">{i.name}</p>
                            <p className="mt-1.5"><span className="inline-block whitespace-nowrap"><Chip>{i.category}</Chip></span></p>
                            <p className="mt-1 text-xs text-muted">{days(t.addedAt) === 0 ? "Tracked today" : `Tracked ${days(t.addedAt)} days ago`}</p></div>
                          <button aria-label={`Stop tracking ${i.name}`} onClick={() => untrack(t.issueId)} className="text-muted hover:text-rose-600"><Trash2 size={14} /></button>
                        </div>
                        <select aria-label="Status" value={t.status} onChange={(e) => updateTracked(t.issueId, { status: e.target.value as TrackedStatus })} className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-sm">{STATUSES.map((x) => <option key={x.s}>{x.s}</option>)}</select>
                        <input aria-label="Owner" placeholder="Owner" value={t.owner} onChange={(e) => updateTracked(t.issueId, { owner: e.target.value })} className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-sm" />
                        <textarea aria-label="Notes" placeholder="Notes" value={t.note} onChange={(e) => updateTracked(t.issueId, { note: e.target.value })} rows={2} className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-sm" />
                      </article>);
                  })}
                  {dragging && over === s && draggedStatus !== s && <div className="slot-in rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/70 px-3 py-6 text-center text-xs font-medium text-indigo-600">Move to {s}</div>}
                  {count(s) === 0 && !(dragging && over === s) && <p className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-muted">{dragging ? "Drop here" : "Nothing here"}</p>}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}
