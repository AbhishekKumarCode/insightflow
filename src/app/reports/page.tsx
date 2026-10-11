"use client";
import { useEffect, useMemo, useState } from "react";
import { Download, Printer, Save } from "lucide-react";
import { rankIssues, summarize, DEFAULT_FILTERS, pct, fmt, issueById } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Card, PageHead, ScoreBadge, btn, btnPrimary } from "@/components/ui";

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

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [["Rank", "Issue", "Category", "Priority score", "Negative reviews", "Why", "Actions", "Tracked status"].map(esc).join(",")];
    ranked.forEach((i, n) => lines.push([n + 1, i.name, i.category, i.score, i.negative, i.recommendation?.why ?? "", i.recommendation?.actions.join(" | ") ?? "", tracked.find((t) => t.issueId === i.id)?.status ?? ""].map(esc).join(",")));
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" })), download: "insightflow-issues.csv" });
    a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <PageHead title="Reports" sub="A one-page summary you can print to PDF, export as CSV, or save." right={
        <div className="no-print flex flex-wrap gap-2">
          <button className={btn} onClick={exportCsv}><Download size={16} />Export CSV</button>
          <button className={btn} onClick={() => window.print()}><Printer size={16} />Print / PDF</button>
          <button className={btnPrimary} onClick={() => saveReport({ id: crypto.randomUUID(), title: `Insight report, ${date}`, createdAt: new Date().toISOString(), topIssueIds: top.map((i) => i.id) })}><Save size={16} />Save report</button>
        </div>} />
      <article className="mx-auto max-w-3xl space-y-8 rounded-xl border border-line bg-white p-8 md:p-12">
        <header><p className="text-sm text-muted">InsightFlow · {date}</p><h2 className="mt-1 text-2xl font-semibold">Customer feedback insight report</h2></header>
        <section>
          <h3 className="font-semibold">Summary</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            We analyzed {fmt(s.total)} customer reviews ({s.unique} distinct after cleaning). Overall sentiment is {pct(s.sentiment.positive, s.total)}% positive and {pct(s.sentiment.negative, s.total)}% negative (net {net > 0 ? "+" : ""}{net}).
            The top problem is <strong>{top[0]?.name.toLowerCase()}</strong> with {fmt(top[0]?.negative ?? 0)} negative reviews. {top.filter((i) => i.category === "Fraud and Scam").length} of the top {top.length} issues involve fraud, which carries the highest severity.
          </p>
        </section>
        <section>
          <h3 className="font-semibold">Top priorities</h3>
          <ol className="mt-3 space-y-5">
            {top.map((i, n) => (
              <li key={i.id}>
                <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{n + 1}. {i.name}</span><ScoreBadge score={i.score} /></div>
                <p className="mt-1 text-sm text-slate-700">{i.recommendation?.why}</p>
                <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">{i.recommendation?.actions.map((a) => <li key={a}>{a}</li>)}</ul>
              </li>))}
          </ol>
        </section>
        {tracked.length > 0 && <section><h3 className="font-semibold">Tracked issues</h3>
          <ul className="mt-2 space-y-1 text-sm">{tracked.map((t) => <li key={t.issueId}>{issueById(t.issueId).name} <span className="text-muted">· {t.status}{t.owner && ` · ${t.owner}`}</span></li>)}</ul></section>}
        <footer className="border-t border-line pt-4 text-xs text-muted">Scores are a ranking heuristic. Sample data has no dates, so trend charts use a simulated timeline.</footer>
      </article>
      {reports.length > 0 && <Card className="no-print mx-auto mt-6 max-w-3xl"><h3 className="font-semibold">Saved reports</h3>
        <ul className="mt-2 divide-y divide-line text-sm">{reports.map((r) => <li key={r.id} className="py-2">{r.title}<span className="ml-2 text-muted">{new Date(r.createdAt).toLocaleString()}</span></li>)}</ul></Card>}
    </>
  );
}
