"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Check, FilePlus2, ListChecks, MessageSquare, Plus } from "lucide-react";
import { issueById, rankIssues, summarize, fmt, pct, plural } from "@/lib/data";
import { useApp } from "@/lib/store";
import { ScoreRing } from "./ui";

const COLORS = { positive: "#16a34a", neutral: "#d97706", negative: "#dc2626" };

/** The Overview as a phone-first screen: one decision, swipeable numbers, quick actions, a short list. Not the desktop page stacked. */
export function MobileHome() {
  const { filters: f, tracked, track, session, openImport } = useApp();
  const s = useMemo(() => summarize(f), [f]);
  const ranked = useMemo(() => rankIssues(f), [f]);
  const top = ranked[0];
  const net = pct(s.sentiment.positive, s.total) - pct(s.sentiment.negative, s.total);
  const negPct = pct(s.sentiment.negative, s.total);
  const top3 = ranked.slice(0, 3);
  const top3Done = top3.length > 0 && top3.every((i) => tracked.some((t) => t.issueId === i.id));
  const maxNeg = Math.max(1, ...ranked.map((i) => i.negative));

  const cats = useMemo(() => {
    const m: Record<string, { positive: number; neutral: number; negative: number }> = {};
    for (const { r, w } of s.rows) (m[r.category] ??= { positive: 0, neutral: 0, negative: 0 })[r.sentiment] += w;
    return Object.entries(m).map(([c, v]) => { const t = v.positive + v.neutral + v.negative; return { c, t, ...v, neg: pct(v.negative, t) }; }).sort((a, b) => b.neg - a.neg);
  }, [s]);
  const liked = useMemo(() => {
    const m: Record<string, number> = {};
    for (const { r, w } of s.rows) if (r.sentiment === "positive") m[r.issue] = (m[r.issue] ?? 0) + w;
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [s]);
  const week = s.weeklyNeg.slice(f.from, f.to + 1);
  const weekMax = Math.max(1, ...week);

  const kpis = [
    { label: "Reviews", value: fmt(s.total), sub: `${s.unique} distinct`, tone: "" },
    { label: "Net sentiment", value: `${net > 0 ? "+" : ""}${net}`, sub: "positive minus negative", tone: net < 0 ? "text-neg" : "text-pos" },
    { label: "Negative", value: `${negPct}%`, sub: `${fmt(s.sentiment.negative)} reviews`, tone: negPct > 50 ? "text-neg" : "" },
    { label: "Issues ranked", value: String(ranked.length), sub: top ? `top score ${top.score}` : "none", tone: "" },
  ];
  const actions = [
    { key: "track", label: top3Done ? "Top 3 tracked" : "Track top 3", icon: top3Done ? Check : ListChecks, onClick: () => top3.forEach((i) => track(i.id)), disabled: top3Done || !top3.length, primary: !top3Done },
  ];

  return (
    <div data-mobile-home className="space-y-6 md:hidden">
      {/* The decision */}
      {top ? (
        <section className="rounded-3xl bg-hero p-5 text-white" aria-label="What to fix first">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-white/70">Fix this first</p>
              <h2 className="mt-1 text-[24px] font-semibold leading-[1.15]">{top.name}</h2>
            </div>
            <ScoreRing score={top.score} size={56} dark />
          </div>
          <p className="mt-3 text-sm text-white/80">{plural(top.negative, "customer")} reported it · {top.category}</p>
          {top.recommendation?.actions[0] && <p className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-sm leading-relaxed text-white/95"><span className="block text-xs font-medium text-indigo-200">Do this first</span>{top.recommendation.actions[0]}</p>}
          <div className="mt-4 flex gap-2.5">
            <button onClick={() => track(top.id)} disabled={tracked.some((t) => t.issueId === top.id)} className="min-h-11 flex-1 rounded-xl bg-white px-4 text-sm font-semibold text-hero disabled:opacity-70">{tracked.some((t) => t.issueId === top.id) ? "Tracking" : "Track issue"}</button>
            <Link href="/priorities" className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/30 text-sm font-medium">Why <ArrowRight size={16} /></Link>
          </div>
        </section>
      ) : <p className="rounded-2xl bg-white p-5 text-sm text-muted">No negative feedback in this selection.</p>}

      {/* Numbers you can swipe */}
      <section aria-label="Key numbers" className="snap-row -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4">
        {kpis.map((k) => (
          <div key={k.label} className="w-[9.25rem] shrink-0 snap-start rounded-2xl border border-slate-200/70 bg-white p-4">
            <p className="text-xs text-muted">{k.label}</p>
            <p className={`font-display mt-1 text-[30px] font-semibold leading-none tabular-nums ${k.tone}`}>{k.value}</p>
            <p className="mt-1.5 text-[11px] text-muted">{k.sub}</p>
          </div>))}
      </section>

      {/* One-tap actions */}
      <section aria-label="Quick actions" className="grid grid-cols-2 gap-2.5">
        {actions.map((a) => { const Icon = a.icon; return (
          <button key={a.key} onClick={a.onClick} disabled={a.disabled} className={`flex min-h-14 items-center gap-2.5 rounded-2xl border px-4 text-left text-sm font-semibold ${a.primary ? "border-brand bg-brand text-white" : "border-line bg-white text-slate-600"}`}><Icon size={18} />{a.label}</button>); })}
        <button onClick={() => openImport("this")} className="flex min-h-14 items-center gap-2.5 rounded-2xl border border-line bg-white px-4 text-left text-sm font-semibold"><Plus size={18} className="text-brand" />Add feedback</button>
        <Link href="/reports" className="flex min-h-14 items-center gap-2.5 rounded-2xl border border-line bg-white px-4 text-sm font-semibold"><FilePlus2 size={18} className="text-brand" />Report</Link>
        <Link href="/feedback" className="flex min-h-14 items-center gap-2.5 rounded-2xl border border-line bg-white px-4 text-sm font-semibold"><MessageSquare size={18} className="text-brand" />All feedback</Link>
      </section>

      {/* Short ranked list */}
      {ranked.length > 0 && (
        <section aria-label="Top issues">
          <div className="mb-2 flex items-baseline justify-between"><h2 className="text-lg font-semibold">Top issues</h2><Link href="/priorities" className="text-sm font-medium text-brand">See all {ranked.length}</Link></div>
          <ol className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
            {ranked.slice(0, 5).map((i, n) => (
              <li key={i.id}>
                <Link href="/priorities" data-issue-card className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50">
                  <span className="w-4 text-sm tabular-nums text-muted">{n + 1}</span>
                  <span className="min-w-0 flex-1"><span className="block text-[15px] font-medium leading-snug">{i.name}</span>
                    <span className="mt-1.5 block h-1.5 rounded-full bg-slate-100"><span className="block h-1.5 rounded-full" style={{ width: `${(i.negative / maxNeg) * 100}%`, background: i.severity >= 0.85 ? "#f43f5e" : "#6366f1" }} /></span></span>
                  <span className={`font-display text-xl font-semibold tabular-nums ${i.score >= 85 ? "text-neg" : ""}`}>{i.score}</span>
                </Link>
              </li>))}
          </ol>
        </section>)}

      {/* Sentiment, compact */}
      <section aria-label="How customers feel">
        <h2 className="mb-2 text-lg font-semibold">How customers feel</h2>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${pct(s.sentiment.positive, s.total)}% positive, ${negPct}% negative`}>
            <div style={{ width: `${pct(s.sentiment.positive, s.total)}%`, background: COLORS.positive }} /><div style={{ width: `${pct(s.sentiment.neutral, s.total)}%`, background: COLORS.neutral }} /><div style={{ width: `${negPct}%`, background: COLORS.negative }} />
          </div>
          <p className="mt-2 flex justify-between text-xs text-muted"><span>{pct(s.sentiment.positive, s.total)}% positive</span><span>{negPct}% negative</span></p>
          <ul className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            {cats.map((c) => (
              <li key={c.c} className="flex items-center gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{c.c}</span>
                <span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><span className="block h-1.5 rounded-full" style={{ width: `${c.neg}%`, background: COLORS.negative }} /></span>
                <span className="w-10 text-right font-semibold tabular-nums">{c.neg}%</span>
              </li>))}
          </ul>
          <p className="mt-3 text-[11px] text-muted">Share of each category that is negative.</p>
        </div>
      </section>

      {liked.length > 0 && (
        <section aria-label="Strengths">
          <h2 className="mb-2 text-lg font-semibold">What they like</h2>
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200/70 bg-white text-sm">
            {liked.map(([id, n]) => <li key={id} className="flex gap-3 px-4 py-3"><span className="flex-1 font-medium">{issueById(id).name}</span><span className="tabular-nums text-muted">{fmt(n)}</span></li>)}
          </ul>
        </section>)}

      {session.kind === "sample" && s.total > 0 && (
        <section aria-label="Weekly trend">
          <h2 className="mb-2 text-lg font-semibold">Complaints by week</h2>
          <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
            <div className="flex h-24 items-end gap-1" role="img" aria-label="Negative reviews per week">
              {week.map((n, i) => <div key={i} className="flex-1 rounded-t bg-indigo-500/80" style={{ height: `${Math.max(6, (n / weekMax) * 100)}%` }} />)}
            </div>
            <p className="mt-2 text-[11px] text-muted"><b className="font-semibold text-neu">Simulated timeline.</b> The sample has no dates, so weeks are a random spread.</p>
          </div>
        </section>)}
    </div>
  );
}
