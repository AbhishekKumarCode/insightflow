"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ComposedChart } from "recharts";
import { rankIssues, summarize, pct, fmt, issueById, DATA } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Card, PageHead, btn, btnPrimary } from "@/components/ui";
import { FilterBar } from "@/components/filters";

const COLORS = { positive: "#2f8f5b", neutral: "#c98a1b", negative: "#c8372d" };
const plural = (n: number, w: string) => `${fmt(n)} ${w}${n === 1 ? "" : "s"}`;

export default function Overview() {
  const { filters: f, tracked, track } = useApp();
  const s = useMemo(() => summarize(f), [f]);
  const ranked = useMemo(() => rankIssues(f), [f]);
  const net = pct(s.sentiment.positive, s.total) - pct(s.sentiment.negative, s.total);
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
  const highlights = [
    negTotal ? `${pct(fraudNeg, negTotal)}% of negative reviews are in Fraud and Scam, the highest-severity category.` : "No negative feedback in this selection.",
    worstCat ? `${worstCat.c} is the most negative category: ${worstCat.share}% of its reviews.` : "",
    lovedList[0] ? `Customers praise ${issueById(lovedList[0][0]).name.toLowerCase()} most: ${plural(lovedList[0][1], "review")}.` : "",
  ].filter(Boolean);
  const donut = (["positive", "neutral", "negative"] as const).map((k) => ({ name: k === "neutral" ? "Mixed" : k[0].toUpperCase() + k.slice(1), value: s.sentiment[k], color: COLORS[k] }));
  const matrix = ranked.map((i, n) => ({ n: n + 1, name: i.name, x: i.negative, y: Math.round(i.severity * 100), hot: i.severity >= 0.85 }));
  const voice = s.rows.filter((x) => x.r.sentiment === "negative").sort((a, b) => b.w - a.w).slice(0, 5);
  const topTracked = top ? tracked.some((t) => t.issueId === top.id) : false;
  const top3 = ranked.slice(0, 3);
  const top3Left = top3.filter((i) => !tracked.some((t) => t.issueId === i.id));
  const maxNeg = Math.max(1, ...ranked.map((i) => i.negative));

  return (
    <>
      <PageHead title="Overview" sub="What customers are saying, and what to fix first." />
      <FilterBar />
      {empty ? (
        <Card className="py-16 text-center text-muted">No feedback matches these filters. Clear a filter to see everything.</Card>
      ) : (
        <div className="space-y-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
          <section>
            {top ? (
              <>
                <h2 className="max-w-2xl text-[30px] font-semibold leading-tight">Fix {top.name.toLowerCase()} first.</h2>
                <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-600">
                  {plural(top.negative, "customer")} reported it and {pct(top.negative, top.rows) === 100 ? "every report was" : `${pct(top.negative, top.rows)}% of reports were`} negative.
                  It is in {top.category}{top.severity >= 0.85 ? ", where each case means lost money or trust" : ""}. Priority {top.score} out of 100.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/priorities" className={btn}>See how it was scored</Link>
                  <button onClick={() => track(top.id)} disabled={topTracked} className={btnPrimary}>{topTracked ? "Tracking" : "Track this issue"}</button>
                </div>
              </>
            ) : <h2 className="text-2xl font-semibold">No negative feedback in this selection.</h2>}
          </section>
            <section className="rounded-lg border border-line bg-white p-5" aria-label="Share of positive, mixed and negative reviews">
              <div className="flex items-center gap-5">
                <div className="relative size-36 shrink-0">
                  <ResponsiveContainer><PieChart><Pie data={donut} dataKey="value" innerRadius={44} outerRadius={66} paddingAngle={2} stroke="none" isAnimationActive={false}>{donut.map((d) => <Cell key={d.name} fill={d.color} />)}</Pie></PieChart></ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="text-xl font-semibold tabular-nums leading-none">{fmt(s.total)}</p><p className="mt-1 text-[11px] text-muted">reviews</p></div></div>
                </div>
                <ul className="flex-1 space-y-2 text-sm">
                  {donut.map((d) => <li key={d.name} className="flex items-center gap-2"><i className="size-2.5 rounded-full" style={{ background: d.color }} />{d.name}<span className="ml-auto tabular-nums text-muted">{pct(d.value, s.total)}%</span></li>)}
                </ul>
              </div>
            </section>
          </div>

          <section className="grid grid-cols-2 gap-y-6 border-y border-line py-6 lg:grid-cols-4 lg:divide-x lg:divide-line [&>*]:lg:px-6 [&>*:first-child]:lg:pl-0">
            <Fig label="Reviews" value={fmt(s.total)} sub={`${s.unique} distinct`} />
            <Fig label="Net sentiment" value={`${net > 0 ? "+" : ""}${net}`} sub="Positive % minus negative %" />
            <Fig label="Negative" value={`${pct(s.sentiment.negative, s.total)}%`} sub={`${fmt(s.sentiment.negative)} reviews`} />
            <Fig label="Issues ranked" value={String(ranked.length)} sub={top ? `Highest priority ${top.score}` : "None"} />
          </section>

          <div className="grid gap-10 lg:grid-cols-2">
            <section>
              <h2 className="text-lg font-semibold">Priority matrix</h2>
              <p className="mt-1 text-sm text-muted">Each number is an issue from the table below. Top right means many customers and a high cost.</p>
              <div className="mt-3 h-72 rounded-lg border border-line bg-white p-2">
                <ResponsiveContainer>
                  <ScatterChart margin={{ top: 14, right: 18, bottom: 22, left: 4 }}>
                    <CartesianGrid stroke="#dde4ee" />
                    <XAxis type="number" dataKey="x" name="Negative reviews" tickLine={false} axisLine={false} fontSize={11} domain={[0, "dataMax + 40"]} label={{ value: "Negative reviews", position: "insideBottom", offset: -12, fontSize: 11, fill: "#5b6b85" }} />
                    <YAxis type="number" dataKey="y" name="Severity" tickLine={false} axisLine={false} fontSize={11} width={34} domain={[40, 100]} label={{ value: "Severity", angle: -90, position: "insideLeft", fontSize: 11, fill: "#5b6b85" }} />
                    <ReferenceLine y={85} stroke="#c8372d" strokeDasharray="4 4" />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ payload }) => payload?.[0] ? <div className="rounded-md border border-line bg-white px-3 py-2 text-xs shadow-sm"><p className="font-semibold">{payload[0].payload.n}. {payload[0].payload.name}</p><p className="text-muted">{fmt(payload[0].payload.x)} negative reviews, severity {payload[0].payload.y}</p></div> : null} />
                    <Scatter data={matrix} isAnimationActive={false} shape={(props: { cx?: number; cy?: number; payload?: { n: number; hot: boolean } }) => (
                      <g><circle cx={props.cx} cy={props.cy} r={11} fill={props.payload?.hot ? "#c8372d" : "#1d4ed8"} /><text x={props.cx} y={(props.cy ?? 0) + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="#fff">{props.payload?.n}</text></g>)} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section>
              <h2 className="text-lg font-semibold">In customers&apos; words</h2>
              <p className="mt-1 text-sm text-muted">The most repeated complaints, exactly as written.</p>
              <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-white">
                {voice.length === 0 && <li className="p-4 text-sm text-muted">No negative feedback in this selection.</li>}
                {voice.map(({ r, w }) => (
                  <li key={r.id} className="px-4 py-3">
                    <p className="text-sm leading-relaxed">“{r.text}”</p>
                    <p className="mt-1 flex justify-between text-xs text-muted"><span>{issueById(r.issue).name}</span><span className="font-medium tabular-nums text-neg">{fmt(w)} times</span></p>
                  </li>))}
              </ul>
            </section>
          </div>

          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">Issues by priority</h2>
              {top3Left.length > 0 && <button onClick={() => top3.forEach((i) => track(i.id))} className="text-sm font-medium text-brand underline underline-offset-4 hover:text-blue-800">Track the top {top3.length}</button>}
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-900 text-left text-xs text-muted"><tr><th className="w-8 py-2 font-medium">#</th><th className="font-medium">Issue</th><th className="font-medium">Category</th><th className="w-56 font-medium">Negative reviews</th><th className="w-28 font-medium">Weekly</th><th className="w-14 text-right font-medium">Score</th><th className="w-28 pl-4 font-medium">Status</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {ranked.map((i, n) => {
                    const t = tracked.find((x) => x.issueId === i.id);
                    const wk = (issueWeekly[i.id] ?? []).slice(f.from, f.to + 1).map((v, k) => ({ k, v }));
                    return (
                      <tr key={i.id}>
                        <td className="py-3 tabular-nums text-muted">{n + 1}</td>
                        <td className="font-medium">{i.name}</td><td className="text-slate-600">{i.category}</td>
                        <td><div className="flex items-center gap-3"><div className="h-1.5 flex-1 bg-slate-200"><div className="grow h-full" style={{ width: `${(i.negative / maxNeg) * 100}%`, background: i.severity >= 0.85 ? "#c8372d" : "#1d4ed8" }} /></div><span className="w-10 text-right tabular-nums">{fmt(i.negative)}</span></div></td>
                        <td><div className="h-7 w-24"><ResponsiveContainer><AreaChart data={wk}><Area dataKey="v" stroke="#1d4ed8" fill="#e8effd" strokeWidth={1.25} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div></td>
                        <td className={`text-right text-base font-semibold tabular-nums ${i.score >= 85 ? "text-neg" : ""}`}>{i.score}</td>
                        <td className="pl-4 text-xs">{t ? <span className="font-medium">{t.status}</span> : <Link href="/priorities" className="text-muted hover:text-ink">Not tracked</Link>}</td>
                      </tr>);
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted">Score is a ranking heuristic. Red bars are issues that mean lost money or trust. Weekly counts use a simulated timeline.</p>
          </section>

          <div className="grid gap-10 lg:grid-cols-2">
            <section>
              <h2 className="text-lg font-semibold">Sentiment by category</h2>
              <p className="mt-1 text-sm text-muted">Every category mixes praise and complaints, so the category alone doesn&apos;t say what is wrong.</p>
              <ul className="mt-4 space-y-4">
                {Object.entries(catSent).sort((a, b) => b[1].negative / (b[1].positive + b[1].neutral + b[1].negative) - a[1].negative / (a[1].positive + a[1].neutral + a[1].negative)).map(([c, v]) => {
                  const t = v.positive + v.neutral + v.negative;
                  return (
                    <li key={c}>
                      <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{c}</span><span className="tabular-nums text-muted">{fmt(t)} reviews, {pct(v.negative, t)}% negative</span></div>
                      <div className="flex h-2 overflow-hidden bg-slate-200" role="img" aria-label={`${c}: ${pct(v.positive, t)}% positive, ${pct(v.negative, t)}% negative`}>
                        <div style={{ width: `${pct(v.positive, t)}%`, background: COLORS.positive }} /><div style={{ width: `${pct(v.neutral, t)}%`, background: COLORS.neutral }} /><div style={{ width: `${pct(v.negative, t)}%`, background: COLORS.negative }} />
                      </div>
                    </li>);
                })}
              </ul>
              <p className="mt-3 flex gap-4 text-xs text-muted"><span><i className="mr-1.5 inline-block size-2" style={{ background: COLORS.positive }} />Positive</span><span><i className="mr-1.5 inline-block size-2" style={{ background: COLORS.neutral }} />Mixed</span><span><i className="mr-1.5 inline-block size-2" style={{ background: COLORS.negative }} />Negative</span></p>
            </section>
            <section>
              <h2 className="text-lg font-semibold">What customers like</h2>
              <p className="mt-1 text-sm text-muted">Worth protecting while you fix the rest.</p>
              <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
                {lovedList.length === 0 && <li className="py-3 text-muted">No positive feedback in this selection.</li>}
                {lovedList.map(([id, n]) => (
                  <li key={id} className="flex items-baseline gap-3 py-2.5"><span className="flex-1 font-medium">{issueById(id).name}</span><span className="text-muted">{issueById(id).category}</span><span className="w-14 text-right tabular-nums">{fmt(n)}</span></li>
                ))}
              </ul>
            </section>
          </div>

          <section>
            <h2 className="text-lg font-semibold">Volume and negative share over time</h2>
            <p className="mt-1 text-sm text-muted"><b className="font-semibold text-neu">Simulated timeline.</b> {DATA.timeline.note} Real dates are used when an imported file has a date column.</p>
            <div className="mt-4 h-64">
              <ResponsiveContainer>
                <ComposedChart data={trend}>
                  <CartesianGrid vertical={false} stroke="#dde4ee" />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis yAxisId="l" tickLine={false} axisLine={false} fontSize={12} width={40} />
                  <YAxis yAxisId="r" orientation="right" unit="%" domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} width={40} />
                  <Tooltip />
                  <Area yAxisId="l" dataKey="volume" name="Feedback volume" stroke="#1d4ed8" fill="#e8effd" strokeWidth={1.5} isAnimationActive={false} />
                  <Line yAxisId="r" dataKey="negPct" name="Negative %" stroke="#c8372d" strokeWidth={2} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="border-t border-line pt-6">
            <h2 className="text-lg font-semibold">Worth knowing</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] text-slate-700 marker:text-slate-400">{highlights.map((h) => <li key={h}>{h}</li>)}</ul>
          </section>
        </div>
      )}
    </>
  );
}

function Fig({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-[32px] font-semibold leading-none tabular-nums">{value}</p>
      <p className="mt-1.5 text-xs text-muted">{sub}</p>
    </div>
  );
}
