"use client";
import { useEffect, useMemo, useState } from "react";
import { Download, Printer, Save } from "lucide-react";
import { rankIssues, summarize, DEFAULT_FILTERS, pct, fmt, issueById } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Card, PageHead, ScoreRing, btn, btnPrimary } from "@/components/ui";

export default function Reports() {
  const { tracked, reports, saveReport, filters } = useApp();
  // `filters` changes identity when feedback is added, which must refresh this.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const s = useMemo(() => summarize(DEFAULT_FILTERS), [filters]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ranked = useMemo(() => rankIssues(DEFAULT_FILTERS), [filters]);
  const top = ranked.slice(0, 5);
  const [date, setDate] = useState("");
  // Date is read after mount: reading the clock during render is not allowed in a prerendered page.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDate(new Date().toLocaleDateString("en-US", { dateStyle: "long" })), []);
  const net = pct(s.sentiment.positive, s.total) - pct(s.sentiment.negative, s.total);
  const fraudInTop = top.filter((i) => i.category === "Fraud and Scam").length;

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [["Rank", "Issue", "Category", "Priority score", "Negative reviews", "Why", "Actions", "Tracked status"].map(esc).join(",")];
    ranked.forEach((i, n) => lines.push([n + 1, i.name, i.category, i.score, i.negative, i.recommendation?.why ?? "", i.recommendation?.actions.join(" | ") ?? "", tracked.find((t) => t.issueId === i.id)?.status ?? ""].map(esc).join(",")));
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" })), download: "insightflow-issues.csv" });
    a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <PageHead title="Reports" sub="A briefing you can print to PDF, export as CSV, or save." right={
        <div className="no-print flex flex-wrap gap-2">
          <button className={btn} onClick={exportCsv}><Download size={16} />Export CSV</button>
          <button className={btn} onClick={() => window.print()}><Printer size={16} />Print / PDF</button>
          <button className={btnPrimary} onClick={() => saveReport({ id: crypto.randomUUID(), title: `Insight report, ${date}`, createdAt: new Date().toISOString(), topIssueIds: top.map((i) => i.id) })}><Save size={16} />Save report</button>
        </div>} />

      <article className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,18,38,0.04)]">
        <div className="report-mast bg-ink2 px-8 py-9 text-white md:px-12">
          <p className="text-sm text-slate-400">InsightFlow briefing, {date}</p>
          <h2 className="mt-3 max-w-lg text-[32px] font-semibold leading-[1.1]">{top[0] ? `Start with ${top[0].name.toLowerCase()}.` : "No negative feedback to report."}</h2>
          <dl className="mt-7 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
            <div><dt className="text-xs text-slate-400">Reviews analyzed</dt><dd className="font-display mt-1 text-2xl font-semibold tabular-nums">{fmt(s.total)}</dd></div>
            <div><dt className="text-xs text-slate-400">Negative</dt><dd className="font-display mt-1 text-2xl font-semibold tabular-nums">{pct(s.sentiment.negative, s.total)}%</dd></div>
            <div><dt className="text-xs text-slate-400">Net sentiment</dt><dd className="font-display mt-1 text-2xl font-semibold tabular-nums">{net > 0 ? "+" : ""}{net}</dd></div>
          </dl>
        </div>

        <div className="space-y-9 px-8 py-9 md:px-12">
          <section>
            <h3 className="font-display text-xl font-semibold">Summary</h3>
            <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-slate-700">
              Of {fmt(s.total)} reviews ({s.unique} distinct after cleaning), {pct(s.sentiment.positive, s.total)}% are positive and {pct(s.sentiment.negative, s.total)}% negative.
              {top[0] && <> The most-reported problem is {top[0].name.toLowerCase()}, with {fmt(top[0].negative)} negative reviews.</>}
              {fraudInTop > 0 && <> {fraudInTop} of the top {top.length} issues involve fraud, which carries the highest severity.</>}
            </p>
          </section>

          <section>
            <h3 className="font-display text-xl font-semibold">Decisions, in order</h3>
            <ol className="mt-4 space-y-6">
              {top.map((i, n) => (
                <li key={i.id} className="flex gap-4">
                  <ScoreRing score={i.score} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold"><span className="text-muted">{n + 1}.</span> {i.name}</p>
                    <p className="mt-1 max-w-prose text-sm leading-relaxed text-slate-700">{i.recommendation?.why}</p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-700">{i.recommendation?.actions.map((a) => <li key={a} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-indigo-400" />{a}</li>)}</ul>
                    {i.quotes[0] && <blockquote className="mt-3 border-l-2 border-rose-300 pl-3 text-sm italic text-slate-600">“{i.quotes[0].text}” <span className="not-italic text-muted">reported {fmt(i.quotes[0].count)}×</span></blockquote>}
                  </div>
                </li>))}
            </ol>
          </section>

          {tracked.length > 0 && <section><h3 className="font-display text-xl font-semibold">Already in progress</h3>
            <ul className="mt-3 divide-y divide-slate-100 text-sm">{tracked.map((t) => <li key={t.issueId} className="flex gap-3 py-2"><span className="flex-1">{issueById(t.issueId).name}</span><span className="text-muted">{t.status}{t.owner && `, ${t.owner}`}</span></li>)}</ul></section>}

          <footer className="border-t border-slate-200 pt-5 text-xs leading-relaxed text-muted">
            <p><b className="font-medium text-slate-600">Method.</b> Priority score = 100 × (0.40 reach + 0.35 consistency + 0.25 severity). It ranks issues and is not a measurement. Repeated reviews count at their original numbers.</p>
            <p className="mt-1">The sample data has no dates, so trend charts use a simulated 13-week timeline.</p>
          </footer>
        </div>
      </article>

      {reports.length > 0 && <Card className="no-print mx-auto mt-6 max-w-3xl"><h3 className="font-display text-lg font-semibold">Saved reports</h3>
        <ul className="mt-2 divide-y divide-slate-100 text-sm">{reports.map((r) => <li key={r.id} className="py-2.5">{r.title}<span className="ml-2 text-muted">{new Date(r.createdAt).toLocaleString()}</span></li>)}</ul></Card>}
    </>
  );
}
