"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, FileText, Printer, Save, Trash2 } from "lucide-react";
import { categories, rankIssues, summarize, DEFAULT_FILTERS, pct, fmt, issueById } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Card, PageHead, ScoreRing, btn, btnPrimary } from "@/components/ui";

const COLORS = { positive: "#16a34a", neutral: "#d97706", negative: "#dc2626" };
const SECTIONS = [
  { key: "summary", label: "Summary" },
  { key: "priorities", label: "Priorities, with actions" },
  { key: "sentiment", label: "Sentiment by category" },
  { key: "likes", label: "What customers like" },
  { key: "tracked", label: "Issues already tracked" },
  { key: "method", label: "How scores are calculated" },
] as const;
type Key = (typeof SECTIONS)[number]["key"];

export default function Reports() {
  const { tracked, reports, saveReport, deleteReport, filters, session } = useApp();
  const [copied, setCopied] = useState(false);
  const [date, setDate] = useState("");
  // Date is read after mount: reading the clock during render is not allowed in a prerendered page.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDate(new Date().toLocaleDateString("en-US", { dateStyle: "long" })), []);

  // Report options. The title falls back to a dated default until you type your own.
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [scope, setScope] = useState("all");
  const [topN, setTopN] = useState(5);
  const [note, setNote] = useState("");
  const [on, setOn] = useState<Record<Key, boolean>>({ summary: true, priorities: true, sentiment: true, likes: true, tracked: true, method: true });
  const title = titleDraft ?? `Insight report, ${date}`;
  const scopeLabel = scope === "all" ? "All categories" : scope;

  // `filters` changes identity when the active session or its data changes, which must refresh this.
  const f = useMemo(() => ({ ...DEFAULT_FILTERS, category: scope }), [scope]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const s = useMemo(() => summarize(f), [f, filters]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ranked = useMemo(() => rankIssues(f), [f, filters]);
  const top = ranked.slice(0, topN);
  const net = pct(s.sentiment.positive, s.total) - pct(s.sentiment.negative, s.total);
  const negPct = pct(s.sentiment.negative, s.total);

  const catRows = useMemo(() => {
    const m: Record<string, { positive: number; neutral: number; negative: number }> = {};
    for (const { r, w } of s.rows) (m[r.category] ??= { positive: 0, neutral: 0, negative: 0 })[r.sentiment] += w;
    return Object.entries(m).map(([c, v]) => { const t = v.positive + v.neutral + v.negative; return { c, t, ...v, negPct: pct(v.negative, t) }; }).sort((a, b) => b.negPct - a.negPct);
  }, [s]);
  const liked = useMemo(() => {
    const m: Record<string, number> = {};
    for (const { r, w } of s.rows) if (r.sentiment === "positive") m[r.issue] = (m[r.issue] ?? 0) + w;
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [s]);

  // Compare with the latest saved report that used the same scope.
  const prev = reports.find((r) => (r.scope ?? "all") === scope && r.totals);
  const delta = prev?.totals ? negPct - prev.totals.negativePct : null;
  const prevTop = prev?.items?.[0]?.name;

  const bullet = (n: number, i: (typeof top)[number]) => `${n + 1}. ${i.name} (priority ${i.score}, ${fmt(i.negative)} negative reviews). ${i.recommendation?.actions[0] ?? ""}`;
  const summaryText = () => [
    title, `${session.name}, ${scopeLabel}, ${date}`,
    `${fmt(s.total)} reviews analyzed, ${negPct}% negative (net sentiment ${net > 0 ? "+" : ""}${net}).`,
    ...(note.trim() ? ["", note.trim()] : []),
    "", "Top priorities:", ...top.map((i, n) => bullet(n, i)),
    "", "Priority score = 100 x (0.40 volume + 0.35 negative share + 0.25 severity), a ranking heuristic.",
  ].join("\n");
  const markdown = () => [
    `# ${title}`, `*${session.name} · ${scopeLabel} · ${date}*`, "",
    `**${fmt(s.total)}** reviews analyzed, **${negPct}%** negative, net sentiment **${net > 0 ? "+" : ""}${net}**.`,
    ...(note.trim() ? ["", `> ${note.trim().replace(/\n/g, "\n> ")}`] : []),
    ...(on.priorities ? ["", "## Priorities", ...top.flatMap((i, n) => ["", `### ${n + 1}. ${i.name} (priority ${i.score})`, i.recommendation?.why ?? "", ...(i.recommendation?.actions.map((a) => `- ${a}`) ?? []), ...(i.quotes[0] ? [``, `> “${i.quotes[0].text}” (reported ${fmt(i.quotes[0].count)}×)`] : [])])] : []),
    ...(on.sentiment ? ["", "## Sentiment by category", "", "| Category | Reviews | Negative |", "|---|---|---|", ...catRows.map((r) => `| ${r.c} | ${fmt(r.t)} | ${r.negPct}% |`)] : []),
    ...(on.method ? ["", "---", "Priority score = 100 × (0.40 volume + 0.35 negative share + 0.25 severity). It ranks issues and is not a measurement."] : []),
  ].join("\n");

  const download = (name: string, text: string, type: string) => {
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([text], { type })), download: name });
    a.click(); URL.revokeObjectURL(a.href);
  };
  const copySummary = async () => {
    try { await navigator.clipboard.writeText(summaryText()); }
    catch { const t = Object.assign(document.createElement("textarea"), { value: summaryText() }); document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const exportCsv = () => {
    // Cells that start with = + - @ (or a tab/CR) run as formulas in Excel and Sheets. Issue names and quotes come from
    // imported reviews, so neutralize them with a leading apostrophe before quoting.
    const esc = (v: string | number) => { let t = String(v); if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`; return `"${t.replace(/"/g, '""')}"`; };
    const lines = [["Rank", "Issue", "Category", "Priority score", "Negative reviews", "Why", "Actions", "Tracked status"].map(esc).join(",")];
    ranked.forEach((i, n) => lines.push([n + 1, i.name, i.category, i.score, i.negative, i.recommendation?.why ?? "", i.recommendation?.actions.join(" | ") ?? "", tracked.find((t) => t.issueId === i.id)?.status ?? ""].map(esc).join(",")));
    download("insightflow-issues.csv", lines.join("\n"), "text/csv");
  };
  const save = () => saveReport({ id: crypto.randomUUID(), title, createdAt: new Date().toISOString(), topIssueIds: top.map((i) => i.id), items: top.map((i) => ({ name: i.name, score: i.score })), totals: { reviews: s.total, negativePct: negPct }, scope });

  return (
    <>
      <PageHead title="Reports" sub="Choose what goes in, check the preview, then print, download or save." right={
        <div className="no-print flex flex-wrap gap-2">
          <button className={btn} onClick={exportCsv}><Download size={16} />Export CSV</button>
          <button className={btn} onClick={() => download("insightflow-report.md", markdown(), "text/markdown")}><FileText size={16} />Download .md</button>
          <button className={btn} onClick={copySummary}>{copied ? <><Check size={16} />Copied</> : <><Copy size={16} />Copy summary</>}</button>
          <button className={btn} onClick={() => window.print()}><Printer size={16} />Print / PDF</button>
          <button className={btnPrimary} onClick={save}><Save size={16} />Save report</button>
        </div>} />

      <div className="grid gap-6 print:block lg:grid-cols-[18rem_1fr]">
        <aside className="no-print space-y-5 self-start rounded-2xl border border-slate-200/70 bg-white p-5 lg:sticky lg:top-24" aria-label="Report options">
          <h2 className="text-base font-semibold">Customize</h2>
          <label className="block text-sm"><span className="font-medium">Title</span>
            <input value={title} onChange={(e) => setTitleDraft(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand" /></label>
          <label className="block text-sm"><span className="font-medium">Cover</span>
            <select value={scope} onChange={(e) => setScope(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"><option value="all">All categories</option>{categories().map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="block text-sm"><span className="font-medium">Priorities to include</span>
            <select value={topN} onChange={(e) => setTopN(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"><option value={3}>Top 3</option><option value={5}>Top 5</option><option value={8}>Top 8</option></select></label>
          <fieldset className="text-sm"><legend className="font-medium">Sections</legend>
            <div className="mt-1.5 space-y-1.5">{SECTIONS.map(({ key, label }) => (
              <label key={key} className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={on[key]} onChange={(e) => setOn((o) => ({ ...o, [key]: e.target.checked }))} className="size-4 accent-indigo-600" />{label}</label>))}</div></fieldset>
          <label className="block text-sm"><span className="font-medium">Note for readers</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="One or two sentences of context for your team" className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand" /></label>
        </aside>

        <article className="min-w-0 overflow-hidden rounded-3xl border border-slate-200/70 bg-white">
          <div className="report-mast bg-ink2 px-8 py-9 text-white md:px-12">
            <p className="text-sm text-slate-400">{title}</p>
            <p className="mt-1 text-xs text-slate-500">{session.name} · {scopeLabel} · {date}</p>
            <h2 className="mt-4 max-w-lg text-[32px] font-semibold leading-[1.1]">{top[0] ? `Start with ${top[0].name.toLowerCase()}.` : "No negative feedback to report."}</h2>
            <dl className="mt-7 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
              <div><dt className="text-xs text-slate-400">Reviews analyzed</dt><dd className="font-display mt-1 text-2xl font-semibold tabular-nums">{fmt(s.total)}</dd></div>
              <div><dt className="text-xs text-slate-400">Negative</dt><dd className="font-display mt-1 text-2xl font-semibold tabular-nums">{negPct}%</dd></div>
              <div><dt className="text-xs text-slate-400">Net sentiment</dt><dd className="font-display mt-1 text-2xl font-semibold tabular-nums">{net > 0 ? "+" : ""}{net}</dd></div>
            </dl>
          </div>

          <div className="space-y-9 px-8 py-9 md:px-12">
            {note.trim() && <section className="rounded-xl border-l-4 border-indigo-400 bg-indigo-50/60 px-5 py-4"><p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{note.trim()}</p></section>}

            {on.summary && (
              <section>
                <h3 className="text-lg font-semibold">Summary</h3>
                <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-slate-700">
                  Of {fmt(s.total)} reviews ({s.unique} distinct), {pct(s.sentiment.positive, s.total)}% are positive and {negPct}% negative.
                  {top[0] && <> The most-reported problem is {top[0].name.toLowerCase()}, with {fmt(top[0].negative)} negative reviews and a priority score of {top[0].score}.</>}
                  {ranked.length > 0 && <> {ranked.length} issues were ranked in total.</>}
                </p>
                {delta !== null && prev && (
                  <p className="mt-3 max-w-prose rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <b className="font-medium">Since your last saved report</b> ({new Date(prev.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}): negative share {delta === 0 ? "is unchanged" : `${delta > 0 ? "rose" : "fell"} by ${Math.abs(delta)} point${Math.abs(delta) === 1 ? "" : "s"}`}
                    {prevTop && top[0] && (prevTop === top[0].name ? ", and the top issue is the same." : `, and the top issue changed from “${prevTop}” to “${top[0].name}”.`)}
                  </p>)}
              </section>)}

            {on.priorities && top.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold">Priorities</h3>
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
              </section>)}

            {on.sentiment && catRows.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold">Sentiment by category</h3>
                <ul className="mt-3 space-y-3">
                  {catRows.map((r) => (
                    <li key={r.c}>
                      <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{r.c}</span><span className="tabular-nums text-muted">{fmt(r.t)} reviews, {r.negPct}% negative</span></div>
                      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${r.c}: ${pct(r.positive, r.t)}% positive, ${r.negPct}% negative`}>
                        <div style={{ width: `${pct(r.positive, r.t)}%`, background: COLORS.positive }} /><div style={{ width: `${pct(r.neutral, r.t)}%`, background: COLORS.neutral }} /><div style={{ width: `${r.negPct}%`, background: COLORS.negative }} />
                      </div>
                    </li>))}
                </ul>
                <p className="mt-2 flex gap-4 text-xs text-muted"><span>Green: positive</span><span>Amber: mixed</span><span>Red: negative</span></p>
              </section>)}

            {on.likes && liked.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold">What customers like</h3>
                <ul className="mt-2 divide-y divide-slate-100 text-sm">{liked.map(([id, n]) => <li key={id} className="flex gap-3 py-2"><span className="flex-1">{issueById(id).name}</span><span className="tabular-nums text-muted">{fmt(n)} reviews</span></li>)}</ul>
              </section>)}

            {on.tracked && tracked.length > 0 && (
              <section><h3 className="text-lg font-semibold">Already in progress</h3>
                <ul className="mt-3 divide-y divide-slate-100 text-sm">{tracked.map((t) => <li key={t.issueId} className="flex gap-3 py-2"><span className="flex-1">{issueById(t.issueId).name}</span><span className="text-muted">{t.status}{t.owner && `, ${t.owner}`}</span></li>)}</ul></section>)}

            {on.method && (
              <footer className="border-t border-slate-200 pt-5 text-xs leading-relaxed text-muted">
                <p><b className="font-medium text-slate-600">Method.</b> Priority score = 100 × (0.40 volume + 0.35 negative share + 0.25 severity). It ranks issues and is not a measurement. Repeated reviews count at their original numbers.</p>
                {session.kind === "sample" && <p className="mt-1">The sample data has no dates, so trend charts use a simulated 13-week timeline.</p>}
              </footer>)}
          </div>
        </article>
      </div>

      {reports.length > 0 && (
        <Card className="no-print mt-6">
          <h3 className="text-lg font-semibold">Saved reports</h3>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {reports.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex items-center gap-3">
                  <details className="group min-w-0 flex-1">
                    <summary className="cursor-pointer list-none font-medium marker:hidden">{r.title}<span className="ml-2 font-normal text-muted">{new Date(r.createdAt).toLocaleString()}</span></summary>
                    <div className="mt-2 rounded-lg bg-slate-50 p-3">
                      {r.totals && <p className="text-muted">{fmt(r.totals.reviews)} reviews, {r.totals.negativePct}% negative when saved{r.scope && r.scope !== "all" ? `, ${r.scope} only` : ""}.</p>}
                      <ol className="mt-1.5 list-decimal space-y-1 pl-5">{(r.items ?? r.topIssueIds.map((id) => ({ name: issueById(id).name, score: 0 }))).map((i) => <li key={i.name}>{i.name}{i.score > 0 && <span className="ml-2 text-muted">priority {i.score}</span>}</li>)}</ol>
                    </div>
                  </details>
                  <button onClick={() => deleteReport(r.id)} aria-label={`Delete ${r.title}`} className="shrink-0 text-muted hover:text-rose-600"><Trash2 size={15} /></button>
                </div>
              </li>))}
          </ul>
        </Card>)}
    </>
  );
}
