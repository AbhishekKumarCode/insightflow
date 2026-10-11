"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart } from "recharts";
import { rankIssues, summarize, pct, fmt, issueById, DATA } from "@/lib/data";
import { ShieldAlert, ThumbsUp, TrendingDown } from "lucide-react";
import { useApp } from "@/lib/store";
import { Card, PageHead, ScoreBadge, ScoreRing } from "@/components/ui";
import { FilterBar } from "@/components/filters";
import { CountUp } from "@/components/count-up";
import { CheckCircle2, ListPlus } from "lucide-react";

const COLORS = { positive: "#16a34a", neutral: "#d97706", negative: "#dc2626" };

export default function Overview() {
  const { filters: f, tracked, track } = useApp();
  const s = useMemo(() => summarize(f), [f]);
  const ranked = useMemo(() => rankIssues(f), [f]);
  const net = pct(s.sentiment.positive, s.total) - pct(s.sentiment.negative, s.total);
  const donut = (["positive", "neutral", "negative"] as const).map((k) => ({ name: k, value: s.sentiment[k] }));
  const cats = Object.entries(s.categories).sort((a, b) => b[1] - a[1]);
  const trend = s.weekly.map((v, i) => ({ week: `W${i + 1}`, volume: v, negPct: v ? pct(s.weeklyNeg[i], v) : 0 })).slice(f.from, f.to + 1);
  const top = ranked[0];
  const empty = s.total === 0;

  // Derived panels, all computed from the filtered rows.
  const negTotal = s.sentiment.negative;
  const fraudNeg = s.rows.filter((x) => x.r.sentiment === "negative" && x.r.category === "Fraud and Scam").reduce((a, x) => a + x.w, 0);
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
    { icon: ShieldAlert, tone: "text-neg bg-red-50", title: "Fraud drives the risk", body: negTotal ? `${pct(fraudNeg, negTotal)}% of all negative reviews are in Fraud and Scam, the highest-severity category.` : "No negative feedback in this selection." },
    { icon: TrendingDown, tone: "text-amber-600 bg-amber-50", title: "Most negative category", body: worstCat ? `${worstCat.c} is ${worstCat.share}% negative, the highest of any category.` : "No data." },
    { icon: ThumbsUp, tone: "text-pos bg-green-50", title: "Strongest positive", body: lovedList[0] ? `${issueById(lovedList[0][0]).name}: ${fmt(lovedList[0][1])} positive reviews.` : "No positive feedback in this selection." },
  ];

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
            <section className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
              <div className="flex flex-col rounded-3xl bg-ink2 p-7 text-white md:p-9">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-slate-400">What to fix first</p>
                  <ScoreRing score={top.score} size={56} dark />
                </div>
                <h2 className="mt-3 max-w-md text-[34px] font-semibold leading-[1.08] md:text-[40px]">{top.name}</h2>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-300">{top.recommendation?.why ?? `It sits in ${top.category}.`}</p>
                <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
                  <div><dt className="text-xs text-slate-400">Reported</dt><dd className="font-display mt-1 text-2xl font-semibold tabular-nums">{fmt(top.negative)}</dd></div>
                  <div><dt className="text-xs text-slate-400">Negative</dt><dd className="font-display mt-1 text-2xl font-semibold tabular-nums">{pct(top.negative, top.rows)}%</dd></div>
                  <div><dt className="text-xs text-slate-400">Category</dt><dd className="mt-1 text-[15px] font-medium leading-snug">{top.category}</dd></div>
                </dl>
                {top.recommendation?.actions[0] && (
                  <div className="mt-5 rounded-2xl bg-white/[0.07] p-4">
                    <p className="text-xs font-medium text-indigo-300">Do this first</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-100">{top.recommendation.actions[0]}</p>
                  </div>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
                  <Link href="/priorities" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-ink2 transition hover:bg-slate-100">See why it ranks first <ArrowRight size={16} /></Link>
                  <button onClick={() => track(top.id)} disabled={tracked.some((t) => t.issueId === top.id)} className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-60">
                    {tracked.some((t) => t.issueId === top.id) ? "Tracking" : "Track this issue"}
                  </button>
                </div>
              </div>

              <div className="flex flex-col rounded-3xl border border-slate-200/70 bg-white p-7 md:p-9">
                <div className="flex items-baseline justify-between"><h3 className="text-lg font-semibold">Pressure board</h3>
                  <Link href="/priorities" className="text-sm font-medium text-indigo-600 hover:underline">All {ranked.length} issues</Link></div>
                <p className="mt-1 text-sm text-muted">The five issues that need attention soonest.</p>
                <ol className="mt-5 flex flex-1 flex-col justify-between gap-4">
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

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="text-lg font-semibold">Sentiment distribution</h2>
              <div className="mt-2 flex items-center gap-6">
                <div className="h-44 w-44 shrink-0">
                  <ResponsiveContainer><PieChart><Pie data={donut} dataKey="value" innerRadius={52} outerRadius={80} paddingAngle={2} stroke="none">
                    {donut.map((d) => <Cell key={d.name} fill={COLORS[d.name]} />)}</Pie><Tooltip formatter={(v) => fmt(Number(v))} /></PieChart></ResponsiveContainer>
                </div>
                <ul className="flex-1 space-y-2 text-sm">
                  {donut.map((d) => (
                    <li key={d.name} className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: COLORS[d.name] }} />
                      <span className="capitalize">{d.name}</span><span className="ml-auto font-medium">{fmt(d.value)}</span><span className="w-10 text-right text-muted">{pct(d.value, s.total)}%</span></li>
                  ))}
                </ul>
              </div>
            </Card>
            <Card>
              <h2 className="text-lg font-semibold">Feedback by category</h2>
              <div className="mt-4 space-y-4">
                {cats.map(([c, n]) => (
                  <div key={c}>
                    <div className="mb-1 flex justify-between text-sm"><span>{c}</span><span className="font-medium">{fmt(n)} <span className="text-muted">({pct(n, s.total)}%)</span></span></div>
                    <div className="h-2 rounded-full bg-slate-100"><div className="grow h-2 rounded-full bg-brand" style={{ width: `${pct(n, cats[0][1])}%` }} /></div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div><h2 className="text-lg font-semibold">Volume and negative share over time <span className="ml-1 rounded bg-amber-50 px-2 py-0.5 align-middle text-xs font-medium text-amber-700">Demo timeline (simulated)</span></h2>
                <p className="text-sm text-muted">{DATA.timeline.note} Real dates are used when an imported file has a date column.</p></div>
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer>
                <ComposedChart data={trend}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis yAxisId="l" tickLine={false} axisLine={false} fontSize={12} width={40} />
                  <YAxis yAxisId="r" orientation="right" unit="%" domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} width={40} />
                  <Tooltip />
                  <Area yAxisId="l" dataKey="volume" name="Feedback volume" stroke="#4f46e5" fill="#eef0ff" strokeWidth={2} />
                  <Line yAxisId="r" dataKey="negPct" name="Negative %" stroke="#dc2626" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="text-lg font-semibold">Sentiment by category</h2>
              <p className="text-sm text-muted">Each category mixes praise and complaints, so category alone does not tell you what is wrong.</p>
              <div className="mt-4 space-y-4">
                {Object.entries(catSent).map(([c, v]) => {
                  const t = v.positive + v.neutral + v.negative;
                  return (
                    <div key={c}>
                      <div className="mb-1 flex justify-between text-sm"><span>{c}</span><span className="text-muted">{pct(v.negative, t)}% negative</span></div>
                      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${c}: ${pct(v.positive, t)}% positive, ${pct(v.negative, t)}% negative`}>
                        <div className="grow" style={{ width: `${pct(v.positive, t)}%`, background: COLORS.positive }} />
                        <div className="grow" style={{ width: `${pct(v.neutral, t)}%`, background: COLORS.neutral }} />
                        <div className="grow" style={{ width: `${pct(v.negative, t)}%`, background: COLORS.negative }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card>
              <h2 className="text-lg font-semibold">What customers love</h2>
              <p className="text-sm text-muted">The positive side, so you know what to protect.</p>
              <ul className="mt-3 divide-y divide-line">
                {lovedList.length === 0 && <li className="py-3 text-sm text-muted">No positive feedback in this selection.</li>}
                {lovedList.map(([id, n]) => (
                  <li key={id} className="flex items-center gap-3 py-2.5 text-sm">
                    <ThumbsUp size={14} className="text-pos" /><span className="flex-1">{issueById(id).name}</span>
                    <span className="text-muted">{issueById(id).category}</span><span className="w-14 text-right font-medium">{fmt(n)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="!p-0 overflow-hidden">
            <div className="px-5 pt-5"><h2 className="text-lg font-semibold">Issue watchlist</h2><p className="text-sm text-muted">Every ranked issue with its weekly negative volume (simulated timeline).</p></div>
            <div className="overflow-x-auto"><table className="mt-3 w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted"><tr><th className="px-5 py-2">Issue</th><th className="px-3">Category</th><th className="px-3 text-right">Negative</th><th className="px-3">Weekly</th><th className="px-3">Score</th><th className="px-5 text-right">Status</th></tr></thead>
              <tbody className="divide-y divide-line">
                {ranked.map((i) => {
                  const t = tracked.find((x) => x.issueId === i.id);
                  const wk = (issueWeekly[i.id] ?? []).slice(f.from, f.to + 1).map((v, k) => ({ k, v }));
                  return (
                    <tr key={i.id}>
                      <td className="px-5 py-2.5 font-medium">{i.name}</td><td className="px-3 text-muted">{i.category}</td>
                      <td className="px-3 text-right tabular-nums">{fmt(i.negative)}</td>
                      <td className="w-32 px-3"><div className="h-8 w-28"><ResponsiveContainer><AreaChart data={wk}><Area dataKey="v" stroke="#4f46e5" fill="#eef0ff" strokeWidth={1.5} /></AreaChart></ResponsiveContainer></div></td>
                      <td className="px-3"><div className="flex items-center gap-2"><ScoreBadge score={i.score} /><div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 xl:block"><div className="grow h-full rounded-full" style={{ width: `${i.score}%`, background: i.score >= 85 ? "#dc2626" : i.score >= 70 ? "#d97706" : "#4f46e5" }} /></div></div></td>
                      <td className="px-5 text-right">{t ? <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">{t.status}</span> : <Link href="/priorities" className="text-xs font-medium text-muted hover:text-brand">Not tracked</Link>}</td>
                    </tr>);
                })}
              </tbody></table></div>
          </Card>

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
