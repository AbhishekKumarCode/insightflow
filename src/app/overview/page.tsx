"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { rankIssues, summarize, pct, fmt, issueById } from "@/lib/data";
import { ShieldAlert, ThumbsUp, TrendingDown } from "lucide-react";
import { useApp } from "@/lib/store";
import { Card, PageHead } from "@/components/ui";
import { FilterBar } from "@/components/filters";
import { CountUp } from "@/components/count-up";
import { CheckCircle2, ListPlus } from "lucide-react";

const COLORS = { positive: "#16a34a", neutral: "#d97706", negative: "#dc2626" };

export default function Overview() {
  const { filters: f, tracked, track, session } = useApp();
  const s = useMemo(() => summarize(f), [f]);
  const ranked = useMemo(() => rankIssues(f), [f]);
  const net = pct(s.sentiment.positive, s.total) - pct(s.sentiment.negative, s.total);
  const top = ranked[0];
  const empty = s.total === 0;

  // Derived panels, all computed from the filtered rows.
  const negTotal = s.sentiment.negative;
  const negByCat: Record<string, number> = {};
  for (const { r, w } of s.rows) if (r.sentiment === "negative") negByCat[r.category] = (negByCat[r.category] ?? 0) + w;
  const [topNegCat, topNegCatN] = Object.entries(negByCat).sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  const loved: Record<string, number> = {};
  const catSent: Record<string, { positive: number; neutral: number; negative: number }> = {};
  const issueWeekly: Record<string, number[]> = {};
  for (const { r, w } of s.rows) {
    (catSent[r.category] ??= { positive: 0, neutral: 0, negative: 0 })[r.sentiment] += w;
    if (r.sentiment === "positive") loved[r.issue] = (loved[r.issue] ?? 0) + w;
    if (r.sentiment === "negative") {
      const wk = (issueWeekly[r.issue] ??= Array(r.weekly.length).fill(0));
      for (let i = f.from; i <= f.to; i++) wk[i] += r.weekly[i];
    }
  }
  const lovedList = Object.entries(loved).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const worstCat = Object.entries(catSent).map(([c, v]) => ({ c, share: pct(v.negative, v.positive + v.neutral + v.negative) })).sort((a, b) => b.share - a.share)[0];
  const insights = [
    { icon: ShieldAlert, tone: "text-neg bg-red-50", title: topNegCat === "Fraud and Scam" ? "Fraud drives the risk" : "Most complaints", body: negTotal ? `${pct(topNegCatN, negTotal)}% of all negative reviews are in ${topNegCat}${topNegCat === "Fraud and Scam" ? ", the highest-severity category" : ""}.` : "No negative feedback in this selection." },
    { icon: TrendingDown, tone: "text-amber-600 bg-amber-50", title: "Most negative category", body: worstCat ? `${worstCat.c} is ${worstCat.share}% negative, the highest of any category.` : "No data." },
    { icon: ThumbsUp, tone: "text-pos bg-green-50", title: "Strongest positive", body: lovedList[0] ? `${issueById(lovedList[0][0]).name}: ${fmt(lovedList[0][1])} positive reviews.` : "No positive feedback in this selection." },
  ];
  const maxNeg = Math.max(1, ...ranked.map((i) => i.negative));
  const catRows = Object.entries(catSent).map(([c, v]) => { const t = v.positive + v.neutral + v.negative; return { c, t, ...v, negPct: pct(v.negative, t) }; }).sort((a, b) => b.negPct - a.negPct);
  const weekNeg = s.weeklyNeg.slice(f.from, f.to + 1).map((v, i) => ({ week: `W${f.from + i + 1}`, n: v }));
  const recent = weekNeg.slice(-4).reduce((a, x) => a + x.n, 0), before = weekNeg.slice(-8, -4).reduce((a, x) => a + x.n, 0);
  const swing = before ? Math.round(((recent - before) / before) * 100) : 0;

  return (
    <>
      <PageHead title="Overview" sub="Sentiment, recurring issues and what to fix first, across all feedback." />
      {ranked.length > 0 && (() => {
        const top3 = ranked.slice(0, 3);
        const left = top3.filter((i) => !tracked.some((t) => t.issueId === i.id));
        return (
          <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 px-5 py-3.5">
            <span className={`grid size-9 shrink-0 place-items-center rounded-full bg-brand text-white ${left.length ? "pulse" : ""}`}>{left.length ? <ListPlus size={20} /> : <CheckCircle2 size={20} />}</span>
            <div className="min-w-56 flex-1">
              <p className="font-semibold">{left.length ? "Recommended next step" : "Top issues are being tracked"}</p>
              <p className="text-sm text-slate-600">{left.length ? `Start tracking the top ${top3.length}: ${top3.map((i) => i.name.toLowerCase()).join(", ")}.` : "Move them forward in the Tracker, then export a report for your team."}</p>
            </div>
            {left.length > 0 ? <button onClick={() => top3.forEach((i) => track(i.id))} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Track top {top3.length} issues</button>
              : <Link href="/tracker" className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Open Tracker <ArrowRight size={16} /></Link>}
            <Link href="/reports" className="text-sm font-medium text-brand hover:underline">Create report</Link>
          </div>
        );
      })()}
      <FilterBar />
      {empty ? (
        <Card className="py-16 text-center text-muted">No feedback matches these filters. <span className="text-brand">Clear filters</span> to see everything.</Card>
      ) : (
        <div className="space-y-6">
          {top && (
            <section className="grid text-white lg:grid-cols-[1.05fr_1fr]">
              <div className="flex flex-col rounded-t-3xl bg-hero p-7 md:p-9 lg:rounded-3xl lg:rounded-tr-none">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-white/70">What to fix first</p>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium">{top.category}</span>
                </div>
                <h2 className="mt-3 max-w-md text-[34px] font-semibold leading-[1.08] md:text-[40px]">{top.name}</h2>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/80">{top.recommendation?.why ?? `It sits in ${top.category}.`}</p>
                <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-white/20 pt-5">
                  <div><dt className="text-xs text-white/60">Reported</dt><dd className="font-display mt-1 text-2xl font-semibold tabular-nums">{fmt(top.negative)}</dd></div>
                  <div><dt className="text-xs text-white/60">Negative</dt><dd className="font-display mt-1 text-2xl font-semibold tabular-nums">{pct(top.negative, top.rows)}%</dd></div>
                  <div><dt className="text-xs text-white/60">Priority</dt><dd className="font-display mt-1 text-2xl font-semibold tabular-nums">{top.score}<span className="text-base font-medium text-white/50">/100</span></dd></div>
                </dl>
                {top.recommendation?.actions[0] && (
                  <div className="mt-5 rounded-2xl bg-white/10 p-4">
                    <p className="text-xs font-medium text-indigo-200">Do this first</p>
                    <p className="mt-1 text-sm leading-relaxed text-white">{top.recommendation.actions[0]}</p>
                  </div>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
                  <Link href="/priorities" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-hero transition hover:bg-indigo-50">See why it ranks first <ArrowRight size={16} /></Link>
                  <button onClick={() => track(top.id)} disabled={tracked.some((t) => t.issueId === top.id)} className="rounded-xl border border-white/30 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-60">
                    {tracked.some((t) => t.issueId === top.id) ? "Tracking" : "Track this issue"}
                  </button>
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-start justify-between gap-4 bg-hero px-7 pb-6 pt-7 md:px-9 md:pt-9 lg:rounded-tr-3xl lg:rounded-br-3xl">
                  <div>
                    <h3 className="text-lg font-semibold">Pressure board</h3>
                    <p className="mt-1 text-sm text-white/70">The five issues that need attention soonest.</p>
                  </div>
                  <Link href="/priorities" className="shrink-0 whitespace-nowrap text-sm font-medium text-indigo-200 hover:underline">All {ranked.length} issues</Link>
                </div>
                <div className="relative flex flex-1">
                  <span aria-hidden className="absolute left-0 top-0 size-8 bg-hero" />
                <div className="relative flex flex-1 flex-col rounded-b-3xl bg-white p-7 text-ink md:p-9 lg:rounded-bl-none lg:rounded-tl-[2rem]">
                  <ol className="flex flex-1 flex-col justify-between gap-4">
                    {ranked.slice(0, 5).map((i, n) => (
                      <li key={i.id}>
                        <div className="flex items-baseline gap-3 text-sm">
                          <span className="w-4 text-slate-400 tabular-nums">{n + 1}</span>
                          <span className="flex-1 font-medium">{i.name}</span>
                          <span className="font-display text-lg font-semibold tabular-nums">{i.score}</span>
                        </div>
                        <div className="ml-7 mt-1.5 h-2 rounded-full bg-slate-100">
                          <div className="grow h-2 rounded-full" style={{ width: `${Math.max(6, i.inputs.volume * 100)}%`, background: i.severity >= 0.85 ? "#f43f5e" : i.severity >= 0.7 ? "#f59e0b" : "#6366f1", animationDelay: `${0.25 + n * 0.09}s` }} />
                        </div>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-4 text-xs text-muted">
                    <span>Bar length: how many reported it</span>
                    <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-rose-500" />Money or trust</span>
                    <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-amber-500" />Broken or unresolved</span>
                    <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-indigo-500" />Inconvenience</span>
                  </p>
                </div>
                </div>
              </div>
            </section>
          )}
          {!top && <Card><h2 className="text-lg font-semibold">What to fix first</h2><p className="mt-1 text-sm text-muted">No negative feedback in this selection.</p></Card>}


          <section className="grid grid-cols-2 divide-slate-200/80 rounded-2xl border border-slate-200/70 bg-white lg:grid-cols-4 lg:divide-x [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(-n+2)]:border-slate-200/80 lg:[&>*:nth-child(-n+2)]:border-b-0">
            <Kpi label="Total feedback" num={s.total} sub={`${s.unique} distinct reviews`} />
            <Kpi label="Net sentiment" num={net} format={(n) => `${Math.round(n) > 0 ? "+" : ""}${Math.round(n)}`} sub="Positive % minus negative %" />
            <Kpi label="Negative share" num={pct(s.sentiment.negative, s.total)} format={(n) => `${Math.round(n)}%`} sub={`${fmt(s.sentiment.negative)} reviews`} />
            <Kpi label="Issues ranked" num={ranked.length} sub={top ? `Highest priority ${top.score}` : "None"} />
          </section>

          <section className="grid divide-slate-200/80 rounded-2xl border border-slate-200/70 bg-white md:grid-cols-3 md:divide-x">
            {insights.map(({ icon: Icon, tone, title, body }) => (
              <div key={title} className="flex gap-3 p-5">
                <Icon size={18} className={`mt-0.5 shrink-0 ${tone.split(" ")[0]}`} />
                <div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-sm leading-relaxed text-muted">{body}</p></div>
              </div>
            ))}
          </section>

          <section>
            <h2 className="text-lg font-semibold">Which problems matter most?</h2>
            <p className="mt-1 text-sm text-muted"><b className="font-medium text-ink">What this tells you:</b> issues at the top reach the most customers and cost the most. A red bar means lost money or trust.</p>
            <Card className="mt-3 !p-0 overflow-hidden">
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-muted"><tr><th className="w-10 px-5 py-2.5 font-medium">#</th><th className="font-medium">Issue</th><th className="hidden font-medium md:table-cell">Category</th><th className="w-52 font-medium">Negative reviews</th><th className="w-16 text-right font-medium">Score</th><th className="w-28 px-5 font-medium">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {ranked.map((i, n) => {
                    const t = tracked.find((x) => x.issueId === i.id);
                    return (
                      <tr key={i.id}>
                        <td className="px-5 py-3 tabular-nums text-muted">{n + 1}</td>
                        <td className="py-3 pr-3 font-medium">{i.name}<span className="block text-xs font-normal text-muted md:hidden">{i.category}</span></td>
                        <td className="hidden text-slate-600 md:table-cell">{i.category}</td>
                        <td className="pr-3"><div className="flex items-center gap-2"><div className="h-2 flex-1 rounded-full bg-slate-100"><div className="h-2 rounded-full" style={{ width: `${(i.negative / maxNeg) * 100}%`, background: i.severity >= 0.85 ? "#f43f5e" : "#6366f1" }} /></div><span className="w-10 text-right tabular-nums">{fmt(i.negative)}</span></div></td>
                        <td className={`text-right text-base font-semibold tabular-nums ${i.score >= 85 ? "text-neg" : ""}`}>{i.score}</td>
                        <td className="px-5 text-xs">{t ? <span className="rounded-full bg-brand-soft px-2.5 py-0.5 font-medium text-brand">{t.status}</span> : <Link href="/priorities" className="text-muted hover:text-brand">Not tracked</Link>}</td>
                      </tr>);
                  })}
                </tbody></table></div>
            </Card>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h2 className="text-lg font-semibold">How do customers feel?</h2>
              <p className="mt-1 text-sm text-muted"><b className="font-medium text-ink">What this tells you:</b> {catRows[0] ? `${catRows[0].c} is the most negative category (${catRows[0].negPct}% of its reviews). Every category mixes praise and complaints, so check the issues, not just the category.` : "No data in this selection."}</p>
              <Card className="mt-3">
                <ul className="space-y-4">
                  {catRows.map((r) => (
                    <li key={r.c}>
                      <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{r.c}</span><span className="tabular-nums text-muted">{fmt(r.t)} reviews, {r.negPct}% negative</span></div>
                      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${r.c}: ${pct(r.positive, r.t)}% positive, ${pct(r.negative, r.t)}% negative`}>
                        <div style={{ width: `${pct(r.positive, r.t)}%`, background: COLORS.positive }} /><div style={{ width: `${pct(r.neutral, r.t)}%`, background: COLORS.neutral }} /><div style={{ width: `${pct(r.negative, r.t)}%`, background: COLORS.negative }} />
                      </div>
                    </li>))}
                </ul>
                <p className="mt-4 flex gap-4 text-xs text-muted"><span className="flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: COLORS.positive }} />Positive</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: COLORS.neutral }} />Mixed</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: COLORS.negative }} />Negative</span></p>
              </Card>
            </section>
            <section>
              <h2 className="text-lg font-semibold">What do they like?</h2>
              <p className="mt-1 text-sm text-muted"><b className="font-medium text-ink">What this tells you:</b> these are strengths to protect while you fix the problems.</p>
              <Card className="mt-3 !p-0">
                <ul className="divide-y divide-slate-100 text-sm">
                  {lovedList.length === 0 && <li className="p-5 text-muted">No positive feedback in this selection.</li>}
                  {lovedList.map(([id, n]) => (
                    <li key={id} className="flex items-baseline gap-3 px-5 py-3"><span className="flex-1 font-medium">{issueById(id).name}</span><span className="hidden text-muted sm:inline">{issueById(id).category}</span><span className="w-14 text-right tabular-nums">{fmt(n)}</span></li>
                  ))}
                </ul>
              </Card>
            </section>
          </div>

          <section>
            <h2 className="text-lg font-semibold">Are complaints rising or falling?</h2>
            {session.kind === "sample" ? (
              <>
                <p className="mt-1 text-sm text-muted"><b className="font-medium text-ink">What this tells you:</b> {weekNeg.length >= 8 ? `in the last 4 weeks there were ${fmt(recent)} negative reviews, ${Math.abs(swing) < 5 ? "about the same as" : `${Math.abs(swing)}% ${swing > 0 ? "more than" : "fewer than"}`} the 4 weeks before.` : "pick a longer period to compare."} <b className="font-semibold text-neu">This timeline is simulated:</b> the sample file has no dates, so reviews are spread across 13 weeks at random.</p>
                <Card className="mt-3">
                  <div className="h-56">
                    <ResponsiveContainer>
                      <BarChart data={weekNeg} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                        <CartesianGrid vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis tickLine={false} axisLine={false} fontSize={12} width={44} />
                        <Tooltip formatter={(v) => [fmt(Number(v)), "Negative reviews"]} cursor={{ fill: "#f1f5f9" }} />
                        <Bar dataKey="n" fill="#6366f1" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-2 text-xs text-muted">Each bar is one week. Taller means more negative reviews that week.</p>
                </Card>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted">This session has no dates, so there is no timeline. Only the sample dataset has a (simulated) weekly timeline.</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function Kpi({ label, num, format = fmt, text, sub }: { label: string; num?: number; format?: (n: number) => string; text?: string; sub: string }) {
  return (
    <div className="p-5 md:p-6">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-display mt-1.5 text-[34px] font-semibold leading-none tabular-nums">{text ?? <CountUp value={num ?? 0} format={format} />}</p>
      <p className="mt-2 text-xs text-muted">{sub}</p>
    </div>
  );
}
