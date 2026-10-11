"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart } from "recharts";
import { rankIssues, summarize, pct, fmt, WEEKS, DATA } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Card, PageHead, ScoreBadge, btn } from "@/components/ui";
import { FilterBar } from "@/components/filters";

const COLORS = { positive: "#16a34a", neutral: "#d97706", negative: "#dc2626" };

export default function Overview() {
  const { filters: f } = useApp();
  const s = useMemo(() => summarize(f), [f]);
  const ranked = useMemo(() => rankIssues(f), [f]);
  const net = pct(s.sentiment.positive, s.total) - pct(s.sentiment.negative, s.total);
  const donut = (["positive", "neutral", "negative"] as const).map((k) => ({ name: k, value: s.sentiment[k] }));
  const cats = Object.entries(s.categories).sort((a, b) => b[1] - a[1]);
  const trend = s.weekly.map((v, i) => ({ week: `W${i + 1}`, volume: v, negPct: v ? pct(s.weeklyNeg[i], v) : 0 })).slice(f.from, f.to + 1);
  const top = ranked[0];
  const empty = s.total === 0;

  return (
    <>
      <PageHead title="Overview" sub="Sentiment, recurring issues and what to fix first, across all feedback."
        right={<Link href="/reports" className={btn}>Create report</Link>} />
      <FilterBar />
      {empty ? (
        <Card className="py-16 text-center text-muted">No feedback matches these filters. <span className="text-brand">Clear filters</span> to see everything.</Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-start justify-between">
              <div><h2 className="text-lg font-semibold">What to fix first</h2><p className="text-sm text-muted">Ranked by priority score: negative volume, negative share and severity.</p></div>
              <Link href="/priorities" className="flex items-center gap-1 text-sm font-medium text-brand">View all priorities <ArrowRight size={14} /></Link>
            </div>
            {ranked.length === 0 ? <p className="text-sm text-muted">No negative feedback in this selection.</p> : (
              <ol className="divide-y divide-line rounded-lg border border-line">
                {ranked.slice(0, 3).map((i, n) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="grid size-6 place-items-center rounded-full bg-slate-100 text-xs font-semibold">{n + 1}</span>
                    <span className="font-medium">{i.name}</span><ScoreBadge score={i.score} />
                    <span className="ml-auto text-sm text-muted">{fmt(i.negative)} negative reviews · {i.category}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Total feedback" value={fmt(s.total)} sub={`${s.unique} unique reviews`} />
            <Kpi label="Net sentiment" value={`${net > 0 ? "+" : ""}${net}`} sub="Positive % minus negative %" />
            <Kpi label="Negative share" value={`${pct(s.sentiment.negative, s.total)}%`} sub={`${fmt(s.sentiment.negative)} reviews`} />
            <Kpi label="Top issue" value={top?.name ?? "None"} sub={top ? `Priority ${top.score}` : "No negative feedback"} small />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="text-lg font-semibold">Sentiment distribution</h2>
              <div className="mt-2 flex items-center gap-6">
                <div className="h-44 w-44 shrink-0">
                  <ResponsiveContainer><PieChart><Pie isAnimationActive={false} data={donut} dataKey="value" innerRadius={52} outerRadius={80} paddingAngle={2} stroke="none">
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
                    <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand" style={{ width: `${pct(n, cats[0][1])}%` }} /></div>
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
                  <Area isAnimationActive={false} yAxisId="l" dataKey="volume" name="Feedback volume" stroke="#4f46e5" fill="#eef0ff" strokeWidth={2} />
                  <Line isAnimationActive={false} yAxisId="r" dataKey="negPct" name="Negative %" stroke="#dc2626" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold">Most reported problems</h2>
            <div className="mt-3 h-72">
              <ResponsiveContainer>
                <BarChart data={[...ranked].sort((a, b) => b.negative - a.negative).slice(0, 8).map((i) => ({ name: i.name, n: i.negative }))} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis type="category" dataKey="name" width={220} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip formatter={(v) => [fmt(Number(v)), "Negative reviews"]} />
                  <Bar isAnimationActive={false} dataKey="n" fill="#4f46e5" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function Kpi({ label, value, sub, small }: { label: string; value: string; sub: string; small?: boolean }) {
  return (
    <Card>
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-2 font-semibold tracking-tight ${small ? "text-lg leading-snug" : "text-3xl"}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </Card>
  );
}
